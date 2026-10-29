import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PiggyBank, Plus, Trash2, Save, ArrowLeft, Pencil, Check, X, Target, TrendingUp, TrendingDown } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { formatMoney } from '../shared/calculatorMath';
import { BarChart } from '../shared/SimpleCharts';

let nextTempId = -1;

/** One budget's editor -- the same income/expense-rows form the page
 * always had, just now scoped to a specific saved budget instead of the
 * one-per-account budget it used to be. */
function BudgetEditor({ budgetId, onBack, onDeleted }) {
  const [title, setTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [categories, setCategories] = useState(null);
  const [savingsGoal, setSavingsGoal] = useState(null);
  const [goalInput, setGoalInput] = useState('');
  const [goalSaved, setGoalSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/finance/budgets/${budgetId}`)
      .then((d) => {
        setTitle(d.title);
        setCategories(d.categories || []);
        setSavingsGoal(d.savings_goal ?? null);
        setGoalInput(d.savings_goal != null ? String(d.savings_goal) : '');
      })
      .catch(() => setCategories([]));
  }, [budgetId]);

  const saveGoal = async () => {
    const value = goalInput.trim() === '' ? null : Number(goalInput);
    const d = await apiRequest('PATCH', { savings_goal: value }, `/finance/budgets/${budgetId}`);
    setSavingsGoal(d.savings_goal ?? null);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
  };

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
      const d = await apiRequest('PUT', body, `/finance/budgets/${budgetId}`);
      setCategories(d.categories || []);
      setSaved(true);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Could not save your budget.');
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async () => {
    if (!titleDraft.trim()) return;
    const d = await apiRequest('PATCH', { title: titleDraft.trim() }, `/finance/budgets/${budgetId}`);
    setTitle(d.title);
    setRenaming(false);
  };

  const deleteBudget = async () => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await apiRequest('DELETE', null, `/finance/budgets/${budgetId}`);
    onDeleted();
  };

  if (categories === null) {
    return <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>;
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
    <div>
      <button type="button" className="fin-back-link" onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> My Budgets
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 18px', flexWrap: 'wrap', gap: 10 }}>
        {renaming ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="gs-input" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} autoFocus />
            <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={saveTitle}><Check size={14} /></button>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setRenaming(false)}><X size={14} /></button>
          </div>
        ) : (
          <h2 style={{ margin: 0 }}>
            {title}
            <button type="button" onClick={() => { setTitleDraft(title); setRenaming(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, color: 'var(--muted)' }}>
              <Pencil size={15} />
            </button>
          </h2>
        )}
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={deleteBudget} style={{ color: '#b3261e', borderColor: '#b3261e' }}>
          <Trash2 size={13} /> Delete this budget
        </button>
      </div>

      {error && <p className="fin-error">{error}</p>}

      <div className="fin-form-section">
        <h3>Income</h3>
        {income.map((c) => (
          <div key={c.id} className="fin-budget-row" style={{ marginBottom: 8 }}>
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
          <div key={c.id} className="fin-budget-row" style={{ marginBottom: 8 }}>
            <input className="gs-input" placeholder="e.g. Rent, Groceries" value={c.name} onChange={(e) => updateRow(c.id, 'name', e.target.value)} />
            <input className="gs-input" type="number" placeholder="Monthly amount" value={c.monthly_amount} onChange={(e) => updateRow(c.id, 'monthly_amount', Number(e.target.value))} />
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => removeRow(c.id)} aria-label="Remove"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => addRow('expense')}><Plus size={13} /> Add expense category</button>
      </div>

      <button type="button" className="gs-btn gs-btn-primary" onClick={save} disabled={saving} style={{ marginBottom: 20 }}>
        <Save size={15} /> {saving ? 'Saving…' : saved ? <>Saved <Check size={14} /></> : 'Save budget'}
      </button>

      <div className="fin-form-section">
        <h3><Target size={15} style={{ verticalAlign: -2 }} /> Your savings goal</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
          How much do you want to put away each month? Set it here and the panel on the right will show whether this budget actually gets you there.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: 220 }}>
            <label className="fin-field-label">Monthly savings goal</label>
            <input className="gs-input" type="number" placeholder="e.g. 500" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onBlur={saveGoal} />
          </div>
          {goalSaved && <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Saved <Check size={13} /></span>}
        </div>
      </div>

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

          {savingsGoal != null ? (
            <>
              <div className="fin-goal-bar">
                <div
                  className={`fin-goal-bar-fill ${savings >= savingsGoal ? 'met' : ''}`}
                  style={{ width: `${savingsGoal > 0 ? Math.min(100, Math.max(0, (savings / savingsGoal) * 100)) : 100}%` }}
                />
              </div>
              <div className="fin-calc-row" style={{ marginTop: 2 }}>
                <span className="fin-calc-row-label">Your goal</span>
                <span className="fin-calc-row-value">{formatMoney(savingsGoal)}/mo</span>
              </div>
              <div className={`fin-goal-status ${savings >= savingsGoal ? 'up' : 'down'}`}>
                {savings >= savingsGoal ? <TrendingUp size={14} style={{ verticalAlign: -2 }} /> : <TrendingDown size={14} style={{ verticalAlign: -2 }} />}
                {' '}{savings >= savingsGoal
                  ? `On track -- ${formatMoney(savings - savingsGoal)} above your goal`
                  : `${formatMoney(savingsGoal - savings)} short of your goal`}
              </div>
              {savings > 0 && (
                <div className="fin-calc-row" style={{ marginTop: 10 }}>
                  <span className="fin-calc-row-label">At this rate, in 1 year</span>
                  <span className="fin-calc-row-value">{formatMoney(savings * 12)}</span>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>
              Set a monthly savings goal above to see whether this budget actually gets you there.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Budgeting() {
  const loggedIn = isLoggedIn();
  const [budgets, setBudgets] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadBudgets = () => {
    if (!loggedIn) return;
    apiRequest('GET', null, '/finance/budgets').then((d) => setBudgets(d.budgets || [])).catch(() => setBudgets([]));
  };

  useEffect(() => { loadBudgets(); }, [loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const createBudget = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const budget = await apiRequest('POST', { title: newTitle.trim() }, '/finance/budgets');
      setNewTitle('');
      setSelectedId(budget.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        {selectedId ? (
          <BudgetEditor
            budgetId={selectedId}
            onBack={() => { setSelectedId(null); loadBudgets(); }}
            onDeleted={() => { setSelectedId(null); loadBudgets(); }}
          />
        ) : (
          <>
            <div className="fin-masthead">
              <div className="fin-masthead-kicker"><PiggyBank size={13} /> Budgeting</div>
              <h1 className="fin-masthead-title">My Budgets</h1>
              <p className="fin-masthead-sub">Keep as many budgets as you need -- a household budget, a side business, a "what if we moved" scenario -- and compare them side by side.</p>
            </div>

            <form onSubmit={createBudget} className="fin-form-section" style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="fin-field-label">New budget name</label>
                <input className="gs-input" placeholder="e.g. Household Budget" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <button type="submit" className="gs-btn gs-btn-primary" disabled={creating}><Plus size={15} /> {creating ? 'Creating…' : 'Create budget'}</button>
            </form>

            {budgets === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
            {budgets && budgets.length === 0 && <p className="fin-empty">You haven't created a budget yet.</p>}
            {budgets && budgets.length > 0 && (
              <div className="fin-budget-grid">
                {budgets.map((b) => (
                  <button key={b.id} type="button" className="fin-budget-card" onClick={() => setSelectedId(b.id)}>
                    <h3>{b.title}</h3>
                    <p>{formatMoney(b.total_income - b.total_expenses)} / month left over</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
