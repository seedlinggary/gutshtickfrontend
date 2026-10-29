import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import { formatMoney } from '../../shared/calculatorMath';

const FIELD_LABELS = {
  grossAnnualIncome: 'Gross annual income',
  incomeTaxWithheld: 'Income tax withheld',
  niWithheld: 'National Insurance withheld',
  healthTaxWithheld: 'Health tax withheld',
  pensionContributions: 'Pension contributions',
  studyFundContributions: 'Study fund contributions',
  creditPoints: 'Credit points',
};

/** Upload a Form 106 PDF and read back whatever this best-effort parser
 * found on it (see backend/finance/routes/form106.py) -- purely a
 * convenience to pre-fill the calculator above instead of typing numbers in
 * by hand. Nothing here is treated as ground truth: every figure is shown
 * as "we think this is X", and the parent decides what to do with it. */
export default function Form106Upload({ onParsed }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setStatus('uploading');
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiRequest('POST', formData, '/finance/form106/parse');
      setResult(data);
      setStatus('idle');
      if (!data.scanned) onParsed(data.fields, data);
    } catch (err) {
      setStatus('error');
      setError(typeof err === 'string' ? err : "Couldn't read that file.");
    }
  };

  return (
    <div className="fin-form-section">
      <h3 style={{ marginTop: 0 }}><FileText size={16} style={{ verticalAlign: -2 }} /> Have your Form 106 handy?</h3>
      <p className="fin-calc-help" style={{ marginTop: 0 }}>
        Upload your annual Form 106 (טופס 106) PDF from your employer and we'll try to read your income, withholding
        and credit points straight off it, then compare them to what the brackets above say you should have paid.
        Text-based PDFs only (a photographed/scanned copy won't work) -- and nothing is uploaded anywhere permanent,
        it's read once for this comparison and discarded.
      </p>
      <label className="gs-btn gs-btn-outline gs-btn-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
        <Upload size={13} /> {status === 'uploading' ? 'Reading…' : 'Upload Form 106 (PDF)'}
        <input type="file" accept="application/pdf" onChange={handleFile} style={{ display: 'none' }} disabled={status === 'uploading'} />
      </label>
      {fileName && status !== 'error' && <span style={{ marginLeft: 10, fontSize: 12.5, color: 'var(--muted)' }}>{fileName}</span>}

      {status === 'error' && <div className="gs-error-box" style={{ marginTop: 10, fontSize: 13 }}>{error}</div>}

      {result && result.scanned && (
        <div className="gs-error-box" style={{ marginTop: 10, fontSize: 13 }}>{result.message}</div>
      )}

      {result && !result.scanned && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{result.message}</p>
          {Object.keys(FIELD_LABELS).map((key) => (
            <div key={key} className="fin-calc-row">
              <span className="fin-calc-row-label">{FIELD_LABELS[key]}</span>
              <span className="fin-calc-row-value">
                {result.fields[key] != null
                  ? (key === 'creditPoints' ? result.fields[key] : formatMoney(result.fields[key], 'ILS'))
                  : <span style={{ color: 'var(--muted)' }}>not found</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
