import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PiggyBank, Plus, Trash2, Save } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { formatMoney } from '../shared/calculatorMath';
import { BarChart } from '../shared/SimpleCharts';

let nextTempId = -1;

export default function Budgeting() {
  const [categories, setCategories] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (!loggedIn) return;
    apiRequest('GET', null, '/finance/budget')
      .then((d) => setCategories(d.categories || []))
      .catch(() => setCategories([]));
  }, [loggedIn]);

  const addRow = (kind) => {
    setCategories((rows) => [...rows, { id: nextTempId--, kind, name: '', monthly_amount: 0 }]);
  };
  const updateRow = (id, key, value) => {
    setCategories((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
    setSaved(false);
  };
  const removeRow = (id) => setCategories((rows) => rows.filter((r) => r.id !== id));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { categories: categories.map(({ kind, name, monthly_amount }) => ({ kind, name, monthly_amount })) };
      const d = await apiRequest('PUT', body, '/finance/budget');
      setCategories(d.categories || []);
      setSaved(true);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Could not save your budget.');
    } finally {
      setSaving(false);
    }
  };

  if (!loggedIn) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}>
        <div className="fin-masthead">
          <div className="fin-masthead-kicker"><PiggyBank size={13} /> Budgeting</div>
          <h1 className="fin-masthead-title">Build a monthly budget</h1>
          <p className="fin-masthead-sub">Sign in to create and save your own budget -- it's tied to your account so it's there next time you come back.</p>
        </div>
        <Link to="/signin" className="gs-btn gs-btn-primary">Sign in to get started</Link>
      </div></div>
    );
  }

  if (categories === null) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  const income = categories.filter((c) => c.kind === 'income');
  const expenses = categories.filter((c) => c.kind === 'expense');
  const totalIncome = income.reduce((sum, c) => sum + (Number(c.monthly_amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, c) => sum + (Number(c.monthly_amount) || 0), 0);
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  const expenseBars = expenses
    .filter((c) => c.name && c.monthly_amount > 0)
    .sort((a, b) => b.monthly_amount - a.monthly_amount)
    .map((c) => ({ label: c.name, value: c.monthly_amount }));

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <div className="fin-masthead">
          <div className="fin-masthead-kicker"><PiggyBank size={13} /> Budgeting</div>
          <h1 className="fin-masthead-title">Your monthly budget</h1>
          <p className="fin-masthead-sub">List your income and expenses to see your savings rate and where your money actually goes. Saved to your account automatically when you hit Save.</p>
        </div>

        {error && <p className="fin-error">{error}</p>}

        <div className="fin-form-section">
          <h3>Income</h3>
          {income.map((c) => (
            <div key={c.id} className="fin-form-grid" style={{ marginBottom: 8, gridTemplateColumns: '1fr 160px 36px' }}>
              <input className="gs-input" placeholder="e.g. Salary" value={c.name} onChange={(e) => updateRow(c.id, 'name', e.target.value)} />
              <input className="gs-input" type="number" placeholder="Monthly amount" value={c.monthly_amount} onChange={(e) => updateRow(c.id, 'monthly_amount', Number(e.target.value))} />
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => removeRow(c.id)} aria-label="Remove"><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => addRow('income')}><Plus size={13} /> Add income source</button>
        </div>

        <div className="fin-form-section">
          <h3>Expenses</h3>
          {expenses.map((c) => (
            <div key={c.id} className="fin-form-grid" style={{ marginBottom: 8, gridTemplateColumns: '1fr 160px 36px' }}>
              <input className="gs-input" placeholder="e.g. Rent, Groceries" value={c.name} onChange={(e) => updateRow(c.id, 'name', e.target.value)} />
              <input className="gs-input" type="number" placeholder="Monthly amount" value={c.monthly_amount} onChange={(e) => updateRow(c.id, 'monthly_amount', Number(e.target.value))} />
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => removeRow(c.id)} aria-label="Remove"><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => addRow('expense')}><Plus size={13} /> Add expense category</button>
        </div>

        <button type="button" className="gs-btn gs-btn-primary" onClick={save} disabled={saving} style={{ marginBottom: 20 }}>
          <Save size={15} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save budget'}
        </button>

        <div className="fin-calc-layout">
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Expense breakdown</h3>
            {expenseBars.length > 0 ? (
              <BarChart bars={expenseBars} formatValue={(v) => formatMoney(v)} />
            ) : (
              <p className="fin-empty">Add some expense categories to see a breakdown.</p>
            )}
          </div>
          <div className="fin-calc-results">
            <h4>This month</h4>
            <div className="fin-calc-headline">{formatMoney(savings)}</div>
            <div className="fin-calc-headline-label">{savings >= 0 ? 'left over' : 'over budget'} ({savingsRate.toFixed(0)}% of income)</div>
            <div className="fin-calc-row"><span className="fin-calc-row-label">Total income</span><span className="fin-calc-row-value">{formatMoney(totalIncome)}</span></div>
            <div className="fin-calc-row total"><span className="fin-calc-row-label">Total expenses</span><span className="fin-calc-row-value">{formatMoney(totalExpenses)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
