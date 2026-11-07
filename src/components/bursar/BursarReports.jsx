// src/components/bursar/BursarReports.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiDownload, 
  FiPrinter, 
  FiFilter, 
  FiCalendar, 
  FiDollarSign, 
  FiAlertCircle 
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, VerticalAlign 
} from 'docx';
import { saveAs } from 'file-saver';

const fmtMoney = (v) => `KSh ${Number(v || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');

const A4_PAGE = {
  size: { width: 11906, height: 16838 },
  margin: { top: 720, right: 720, bottom: 720, left: 720 },
};

// Generates the exact same Word header used in Admin Reports
const buildWordLogoParagraph = (schoolInfo = {}) => {
  const logoBase64 = schoolInfo?.schoolLogo || schoolInfo?.logo || '';
  const schoolName = (schoolInfo?.name || 'School').toUpperCase();
  const motto = schoolInfo?.motto || '';
  const address = schoolInfo?.address || '';
  const phone = schoolInfo?.phone || '';
  const email = schoolInfo?.email || '';

  let imageType = 'png';
  if (typeof logoBase64 === 'string' && logoBase64.startsWith('data:image/')) {
    const m = logoBase64.match(/^data:image\/([a-zA-Z0-9+]+)/);
    if (m) {
      let t = m[1].toLowerCase();
      if (t === 'jpeg') t = 'jpg';
      if (['png', 'jpg', 'gif', 'bmp', 'svg'].includes(t)) imageType = t;
    }
  }

  const logoChildren = [];
  if (logoBase64 && typeof logoBase64 === 'string' && logoBase64.startsWith('data:image/')) {
    try {
      const base64Data = logoBase64.split(',')[1];
      const bin = atob(base64Data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      logoChildren.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({
          type: imageType, data: bytes,
          transformation: { width: 80, height: 80 },
        })],
      }));
    } catch (e) {
      console.warn('⚠️ Logo embed failed:', e.message);
    }
  }
  if (logoChildren.length === 0) {
    logoChildren.push(new Paragraph({ children: [new TextRun({ text: '', size: 2 })] }));
  }

  const infoChildren = [];
  infoChildren.push(new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: schoolName, bold: true, size: 28, color: '1a365d' })],
  }));
  if (motto) {
    infoChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 40 },
      children: [new TextRun({ text: `"${motto}"`, italics: true, size: 18, color: '6b7280' })],
    }));
  }
  if (address) {
    infoChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: address, size: 16, color: '4b5563' })],
    }));
  }
  const contactLine = [phone, email].filter(Boolean).join(' · ');
  if (contactLine) {
    infoChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: contactLine, size: 16, color: '4b5563' })],
    }));
  }

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = {
    top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
    insideHorizontal: noBorder, insideVertical: noBorder,
  };

  const innerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    alignment: AlignmentType.CENTER,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: noBorders, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 0, bottom: 0, left: 0, right: 200 },
          children: logoChildren,
        }),
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          borders: noBorders, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: infoChildren,
        }),
      ],
    })],
  });

  const outerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    alignment: AlignmentType.CENTER,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
        }),
        new TableCell({
          width: { size: 64, type: WidthType.PERCENTAGE },
          borders: noBorders, verticalAlign: VerticalAlign.CENTER,
          children: [innerTable],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [new TextRun({ text: '', size: 2 })] })],
        }),
      ],
    })],
  });

  return [outerTable];
};

const BursarReports = () => {
  const currentYear = new Date().getFullYear();
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  const TERMS = ['Term 1', 'Term 2', 'Term 3'];

  const [loading, setLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({});
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');

  useEffect(() => {
    // Load school info for the report headers
    api.get('/school/settings').then(res => {
      if (res.data?.success) {
        setSchoolInfo({
          name: res.data.data.schoolName || res.data.data.name || '',
          email: res.data.data.schoolEmail || res.data.data.email || '',
          phone: res.data.data.phoneNumber || res.data.data.phone || '',
          address: res.data.data.address || '',
          motto: res.data.data.motto || '',
          schoolLogo: res.data.data.schoolLogo || res.data.data.logo || '',
        });
      }
    }).catch(() => {});
  }, []);

  // ============================================================
  // FETCH & GENERATE COLLECTION REPORT
  // ============================================================
  const generateCollectionReport = async (format = 'excel') => {
    setLoading(true);
    try {
      // Fetch all fee docs for the year
      const res = await api.get(`/fees?year=${selectedYear}`);
      const fees = res.data?.data || [];
      
      const rows = [];
      fees.forEach(fee => {
        const student = fee.studentId;
        const termPayments = (fee.payments || []).filter(p => p.year === selectedYear && p.term === selectedTerm);
        termPayments.forEach(p => {
          rows.push({
            student: student?.name || 'Unknown',
            admNo: student?.admNo || '-',
            class: student?.class || fee.class || '-',
            amount: Number(p.amount) || 0,
            method: p.paymentMethod || 'Cash',
            receipt: p.receiptNumber || '-',
            date: p.date,
          });
        });
      });

      if (rows.length === 0) {
        toast.error('No payments found for this criteria');
        return;
      }

      if (format === 'excel') {
        const headers = ['Date', 'Student', 'Adm No', 'Class', 'Amount', 'Method', 'Receipt #'];
        const data = rows.map(r => [
          fmtDate(r.date), r.student, r.admNo, r.class, r.amount, r.method, r.receipt
        ]);
        const total = rows.reduce((sum, r) => sum + r.amount, 0);
        
        const wsData = [
          [schoolInfo.name || 'School'],
          [`Termly Collection Report — ${selectedTerm} ${selectedYear}`],
          [],
          headers,
          ...data,
          [],
          ['TOTAL COLLECTED', '', '', '', total]
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = headers.map((_, i) => ({ wch: i === 1 ? 25 : 15 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Collection');
        XLSX.writeFile(wb, `Collection_${selectedTerm}_${selectedYear}.xlsx`);
        toast.success('Collection Excel downloaded');
      } else {
        // WORD
        const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
        const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        const children = [];

        children.push(...buildWordLogoParagraph(schoolInfo));
        
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: `TERMLY COLLECTION REPORT`, bold: true, size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `${selectedTerm} | ${selectedYear}`, size: 20 })],
          }),
        );

        const headers = ['Date', 'Student', 'Adm No', 'Class', 'Method', 'Amount'];
        const headerRow = new TableRow({
          children: headers.map(h => new TableCell({
            borders: cellBorders, shading: { fill: 'F0F0F0' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18 })] })]
          }))
        });

        const bodyRows = rows.map(r => new TableRow({
          children: [
            fmtDate(r.date), r.student, r.admNo, r.class, r.method, fmtMoney(r.amount)
          ].map((v, i) => new TableCell({
            borders: cellBorders,
            children: [new Paragraph({ alignment: i === 5 ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: String(v), size: 18 })] })]
          }))
        }));

        const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
        const totalRow = new TableRow({
          children: [
            new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, columnSpan: 5, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL COLLECTED:', bold: true, size: 18 })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtMoney(totalAmount), bold: true, size: 18 })] })] }),
          ]
        });

        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows, totalRow]
        }));

        const doc = new Document({
          sections: [{ properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } }, children }],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Collection_${selectedTerm}_${selectedYear}.docx`);
        toast.success('Collection Word downloaded');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate collection report');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FETCH & GENERATE OUTSTANDING REPORT
  // ============================================================
  const generateOutstandingReport = async (format = 'excel') => {
    setLoading(true);
    try {
      const [feesRes, pupilsRes] = await Promise.all([
        api.get(`/fees?year=${selectedYear}`),
        api.get('/pupils')
      ]);
      
      const fees = feesRes.data?.data || [];
      const pupils = pupilsRes.data?.data || [];
      
      const rows = [];
      pupils.forEach(pupil => {
        const feeDoc = fees.find(f => (f.studentId?._id || f.studentId) === pupil._id);
        if (!feeDoc) return; // Skip students without fee records

        const t1 = feeDoc.feeStructure?.term1 || 0;
        const t2 = feeDoc.feeStructure?.term2 || 0;
        const t3 = feeDoc.feeStructure?.term3 || 0;
        const expected = t1 + t2 + t3;
        
        const paid = (feeDoc.payments || [])
          .filter(p => Number(p.year) === Number(selectedYear))
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);
          
        const balance = expected - paid;

        if (balance > 0) {
          rows.push({
            name: pupil.name,
            admNo: pupil.admNo,
            class: pupil.class,
            expected,
            paid,
            balance
          });
        }
      });

      if (rows.length === 0) {
        toast.error('No outstanding balances found');
        return;
      }

      // Sort by highest balance
      rows.sort((a, b) => b.balance - a.balance);

      if (format === 'excel') {
        const headers = ['Student', 'Adm No', 'Class', 'Expected', 'Paid', 'Balance Due'];
        const data = rows.map(r => [r.name, r.admNo, r.class, r.expected, r.paid, r.balance]);
        const total = rows.reduce((sum, r) => sum + r.balance, 0);
        
        const wsData = [
          [schoolInfo.name || 'School'],
          [`Outstanding Balances — ${selectedYear}`],
          [],
          headers,
          ...data,
          [],
          ['TOTAL OUTSTANDING', '', '', '', '', total]
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Outstanding');
        XLSX.writeFile(wb, `Outstanding_${selectedYear}.xlsx`);
        toast.success('Outstanding Excel downloaded');
      } else {
        // WORD
        const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
        const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        const children = [];

        children.push(...buildWordLogoParagraph(schoolInfo));
        
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: `OUTSTANDING BALANCES REPORT`, bold: true, size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `Year ${selectedYear}`, size: 20 })],
          }),
        );

        const headers = ['Student', 'Adm No', 'Class', 'Expected', 'Paid', 'Balance Due'];
        const headerRow = new TableRow({
          children: headers.map(h => new TableCell({
            borders: cellBorders, shading: { fill: 'F0F0F0' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18 })] })]
          }))
        });

        const bodyRows = rows.map(r => new TableRow({
          children: [
            r.name, r.admNo, r.class, fmtMoney(r.expected), fmtMoney(r.paid), fmtMoney(r.balance)
          ].map((v, i) => new TableCell({
            borders: cellBorders,
            children: [new Paragraph({ alignment: i > 2 ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: String(v), size: 18, bold: i === 5 })] })]
          }))
        }));

        const totalAmount = rows.reduce((sum, r) => sum + r.balance, 0);
        const totalRow = new TableRow({
          children: [
            new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, columnSpan: 5, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL OUTSTANDING:', bold: true, size: 18 })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: 'F5F5F5' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtMoney(totalAmount), bold: true, size: 18 })] })] }),
          ]
        });

        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows, totalRow]
        }));

        const doc = new Document({
          sections: [{ properties: { page: { size: A4_PAGE.size, margin: A4_PAGE.margin } }, children }],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Outstanding_${selectedYear}.docx`);
        toast.success('Outstanding Word downloaded');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate outstanding report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and print official financial documents.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FiCalendar /> Year</label>
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(parseInt(e.target.value))} 
            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FiFilter /> Term</label>
          <select 
            value={selectedTerm} 
            onChange={e => setSelectedTerm(e.target.value)} 
            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collection Report Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><FiDollarSign className="text-green-600"/> Termly Collection Report</h3>
            <p className="text-sm text-gray-500 mb-6">Download a detailed report of all payments received in {selectedTerm} {selectedYear}.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => generateCollectionReport('excel')} 
              disabled={loading}
              className="flex-1 bg-green-50 text-green-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-100 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FiDownload /> Excel
            </button>
            <button 
              onClick={() => generateCollectionReport('word')} 
              disabled={loading}
              className="flex-1 bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FiPrinter /> Print Word
            </button>
          </div>
        </div>

        {/* Outstanding Report Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><FiAlertCircle className="text-red-600"/> Outstanding Balances</h3>
            <p className="text-sm text-gray-500 mb-6">Generate a list of students with outstanding fee balances for {selectedYear}.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => generateOutstandingReport('excel')} 
              disabled={loading}
              className="flex-1 bg-red-50 text-red-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FiDownload /> Excel
            </button>
            <button 
              onClick={() => generateOutstandingReport('word')} 
              disabled={loading}
              className="flex-1 bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FiPrinter /> Print Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BursarReports;