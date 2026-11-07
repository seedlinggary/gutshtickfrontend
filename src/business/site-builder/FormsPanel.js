import React, { useState } from 'react';
import apiRequest from '../../ApiRequest';
import NonprofitFormsPage from '../nonprofit/pages/NonprofitFormsPage';
import NonprofitFormBuilderPage from '../nonprofit/pages/NonprofitFormBuilderPage';
import NonprofitFormResponsesPage from '../nonprofit/pages/NonprofitFormResponsesPage';
import '../nonprofit/nonprofit.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

/** CSV export needs a raw blob fetch (the plain apiRequest only parses
 * JSON) -- same role as nonprofitApi.js's nonprofitFetchBlob, just with
 * this app's regular owner auth header instead of the nonprofit staff
 * one. */
async function ownerFetchBlob(path) {
  const token = localStorage.getItem('cookie');
  const res = await fetch(`${API}${path}`, { headers: { 'x-access-token': token || '' } });
  if (!res.ok) throw 'Could not export';
  return res.blob();
}

/** The same dynamic-form builder the nonprofit module's staff portal
 * uses (NonprofitFormsPage/NonprofitFormBuilderPage/
 * NonprofitFormResponsesPage -- conditional fields, choice/date/name-
 * date-list types, response export), generalized to any business's own
 * owner login via the 'custom_forms' module. Mounted in SiteBuilderTab.js
 * exactly like ProductsPanel/BookingsPanel/CrmPanel/InvoicesPanel --
 * local list/builder/responses view state instead of its own route, same
 * as every other panel there. See backend/business/routes/site_forms.py
 * for why this is a separate route file from the nonprofit one rather
 * than just opening that one up to owner auth too. */
export default function FormsPanel({ businessId }) {
  const [formId, setFormId] = useState(null);
  const [mode, setMode] = useState(null); // null | 'builder' | 'responses'

  const back = () => { setFormId(null); setMode(null); };

  return (
    <div className="gs-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>Custom Forms</h3>
      {mode === 'builder' ? (
        <NonprofitFormBuilderPage
          apiRequest={apiRequest} urlPrefix="/business" formsSegment="custom-forms"
          businessId={businessId} formId={formId} onBack={back}
        />
      ) : mode === 'responses' ? (
        <NonprofitFormResponsesPage
          apiRequest={apiRequest} fetchBlob={ownerFetchBlob} urlPrefix="/business" formsSegment="custom-forms"
          showFamilyLink={false} businessId={businessId} formId={formId} onBack={back}
        />
      ) : (
        <NonprofitFormsPage
          apiRequest={apiRequest} urlPrefix="/business" formsSegment="custom-forms"
          businessId={businessId}
          onOpenItem={(id) => { setFormId(id); setMode('builder'); }}
          onOpenResponses={(id) => { setFormId(id); setMode('responses'); }}
        />
      )}
    </div>
  );
}
