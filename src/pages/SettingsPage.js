import axios from "axios";
import React, { useEffect, useReducer, useState } from "react";
import toast from "react-hot-toast";
import {
  CRow, CCol, CCard, CCardBody, CCardHeader, CButton,
  CFormInput, CFormLabel, CFormSelect, CFormCheck, CAlert,
} from "@coreui/react";
import { getUserPreferences, updateUserPreferences } from "../services/emailService";
import { useApp } from "../context/AppContext";
import LoadingSpinner from "../components/LoadingSpinner";

// Reducer for settings state management
const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_PREFS_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_PREFS_SUCCESS":
      return { 
        ...state, 
        loading: false, 
        prefs: { 
          replyTone: action.payload.replyTone || 'professional',
          autoSend: action.payload.autoSend ?? true,
          customTemplate: action.payload.customTemplate || '',
        } 
      };
    case "FETCH_PREFS_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_PREFS_REQUEST":
      return { ...state, saving: true, saveError: "" };
    case "UPDATE_PREFS_SUCCESS":
      return { ...state, saving: false };
    case "UPDATE_PREFS_FAIL":
      return { ...state, saving: false, saveError: action.payload };
    case "UPDATE_EMAIL_REQUEST":
      return { ...state, emailSaving: true, emailError: "" };
    case "UPDATE_EMAIL_SUCCESS":
      return { ...state, emailSaving: false };
    case "UPDATE_EMAIL_FAIL":
      return { ...state, emailSaving: false, emailError: action.payload };
    case "SET_EMAIL_INPUT":
      return { ...state, emailInput: action.payload };
    case "SET_PREF":
      return { 
        ...state, 
        prefs: { ...state.prefs, [action.payload.key]: action.payload.value } 
      };
    case "SET_REMEMBER_ME":
      return { ...state, rememberMe: action.payload };
    default:
      return state;
  }
};

const SettingsPage = () => {
  const { userEmail, setUserEmail } = useApp();
  
  const [{ 
    emailInput, 
    prefs, 
    loading, 
    error, 
    saving, 
    saveError,
    emailSaving,
    emailError,
    rememberMe,
  }, dispatch] = useReducer(reducer, {
    emailInput: userEmail || '',
    prefs: { replyTone: 'professional', autoSend: true, customTemplate: '' },
    loading: false,
    error: "",
    saving: false,
    saveError: "",
    emailSaving: false,
    emailError: "",
    rememberMe: false,
  });

  const fetchPrefs = async () => {
    if (!userEmail) return;
    
    dispatch({ type: "FETCH_PREFS_REQUEST" });
    try {
      const data = await getUserPreferences(userEmail);
      if (data.user) {
        dispatch({ 
          type: "FETCH_PREFS_SUCCESS", 
          payload: {
            replyTone: data.user.replyTone || 'professional',
            autoSend: data.user.autoSend ?? true,
            customTemplate: data.user.customTemplate || '',
          } 
        });
      }
    } catch (err) {
      dispatch({ 
        type: "FETCH_PREFS_FAIL", 
        payload: err.response?.data?.error || err.response?.data?.message || err.message 
      });
      // Don't show toast for initial fetch if no prefs exist
      if (err.response?.status !== 404) {
        toast.error(err.response?.data?.error || err.response?.data?.message || err.message);
      }
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, [userEmail]);

  const handleSaveEmail = async () => {
    if (!emailInput?.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    dispatch({ type: "UPDATE_EMAIL_REQUEST" });
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.trim())) {
        throw new Error('Please enter a valid email address format');
      }
      
      setUserEmail(emailInput.trim());
      dispatch({ type: "UPDATE_EMAIL_SUCCESS" });
      toast.success('Email saved successfully!');
      
      // Re-fetch preferences for new email
      setTimeout(() => {
        fetchPrefs();
      }, 300);
    } catch (err) {
      dispatch({ 
        type: "UPDATE_EMAIL_FAIL", 
        payload: err.message 
      });
      toast.error(err.message);
    }
  };

  const handleSavePrefs = async () => {
    if (!userEmail) {
      toast.error('Please set your email address first');
      return;
    }
    
    dispatch({ type: "UPDATE_PREFS_REQUEST" });
    try {
      await updateUserPreferences({
        userEmail,
        replyTone: prefs.replyTone,
        autoSend: prefs.autoSend,
        customTemplate: prefs.customTemplate,
      });
      dispatch({ type: "UPDATE_PREFS_SUCCESS" });
      toast.success('Preferences saved successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      dispatch({ 
        type: "UPDATE_PREFS_FAIL", 
        payload: errorMessage 
      });
      toast.error(errorMessage);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-700 mb-1 text-dark">Settings</h4>
        <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
          Configure your Outlook email and AI reply preferences
        </p>
      </div>

      {/* Error Alerts */}
      {error && (
        <CAlert color="warning" dismissible onClose={() => dispatch({ type: "FETCH_PREFS_FAIL", payload: "" })}>
          <strong>Warning:</strong> {error}
        </CAlert>
      )}
      
      {saveError && (
        <CAlert color="danger" dismissible onClose={() => dispatch({ type: "UPDATE_PREFS_FAIL", payload: "" })}>
          <strong>Error:</strong> {saveError}
        </CAlert>
      )}
      
      {emailError && (
        <CAlert color="danger" dismissible onClose={() => dispatch({ type: "UPDATE_EMAIL_FAIL", payload: "" })}>
          <strong>Error:</strong> {emailError}
        </CAlert>
      )}

      <CRow className="g-4">
        {/* Email Config */}
        <CCol md={6}>
          <CCard>
            <CCardHeader className="bg-light">
              <strong>📧 Outlook Email Address</strong>
            </CCardHeader>
            <CCardBody>
              <p className="text-muted mb-3" style={{ fontSize: '0.84rem' }}>
                Enter your Outlook / Microsoft 365 email address. This is used to fetch emails 
                and calendar events via Microsoft Graph API.
              </p>
              
              <div className="mb-3">
                <CFormLabel htmlFor="emailInput" className="fw-semibold">
                  Email Address <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  id="emailInput"
                  type="email"
                  value={emailInput}
                  onChange={(e) => dispatch({ type: "SET_EMAIL_INPUT", payload: e.target.value })}
                  placeholder="you@company.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
                  disabled={emailSaving}
                  className={emailError ? 'is-invalid' : ''}
                />
                {emailError && (
                  <div className="invalid-feedback">{emailError}</div>
                )}
              </div>
              
              {userEmail && (
                <div className="alert alert-success py-2 mb-3" style={{ borderRadius: 8, fontSize: '0.82rem' }}>
                  ✅ Currently using: <strong>{userEmail}</strong>
                </div>
              )}
              
              <CButton 
                color="primary"
                size="sm"
                onClick={handleSaveEmail}
                disabled={emailSaving || !emailInput?.trim()}
              >
                {emailSaving ? <LoadingSpinner size="sm" /> : "Save Email"}
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>

        {/* AI Preferences */}
        <CCol md={6}>
          <CCard>
            <CCardHeader className="bg-light">
              <strong>🤖 AI Reply Preferences</strong>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <CFormLabel htmlFor="replyTone" className="fw-semibold">
                      Reply Tone
                    </CFormLabel>
                    <CFormSelect
                      id="replyTone"
                      value={prefs.replyTone}
                      onChange={(e) => dispatch({ 
                        type: "SET_PREF", 
                        payload: { key: 'replyTone', value: e.target.value } 
                      })}
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                    </CFormSelect>
                    <div className="form-text text-muted" style={{ fontSize: '0.8rem' }}>
                      Sets the tone for Gemini AI-generated replies
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <CFormCheck
                      id="autoSend"
                      label="Auto-send emails (create draft & send in one step)"
                      checked={prefs.autoSend}
                      onChange={(e) => dispatch({ 
                        type: "SET_PREF", 
                        payload: { key: 'autoSend', value: e.target.checked } 
                      })}
                    />
                    <div className="form-text text-muted" style={{ fontSize: '0.8rem' }}>
                      When enabled, emails will be sent automatically after generation
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <CFormLabel htmlFor="customTemplate" className="fw-semibold">
                      Custom Reply Template (optional)
                    </CFormLabel>
                    <textarea
                      id="customTemplate"
                      className="form-control"
                      rows={4}
                      value={prefs.customTemplate}
                      onChange={(e) => dispatch({ 
                        type: "SET_PREF", 
                        payload: { key: 'customTemplate', value: e.target.value } 
                      })}
                      placeholder="Add any custom instructions for AI replies, e.g. 'Always sign off with Best regards, [Name]'"
                      style={{ fontSize: '0.84rem', resize: 'vertical' }}
                    />
                    <div className="form-text text-muted" style={{ fontSize: '0.8rem' }}>
                      These instructions will be included in every AI-generated reply
                    </div>
                  </div>
                  
                  <CButton 
                    color="primary"
                    size="sm"
                    onClick={handleSavePrefs} 
                    disabled={saving || !userEmail}
                  >
                    {saving ? <LoadingSpinner size="sm" /> : "Save Preferences"}
                  </CButton>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* API Info */}
        <CCol md={12}>
          <CCard>
            <CCardHeader className="bg-light">
              <strong>🔌 Backend API Info</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                {[
                  { 
                    label: 'Base URL', 
                    value: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1' 
                  },
                  { 
                    label: 'Email Endpoints', 
                    value: '/email/emails, /email/generate-reply, /email/create-and-send' 
                  },
                  { 
                    label: 'Calendar Endpoints', 
                    value: '/calendar/events/list, /calendar/events/create' 
                  },
                  { 
                    label: 'AI Provider', 
                    value: 'Google Gemini via backend' 
                  },
                ].map((item) => (
                  <CCol key={item.label} md={6} lg={3}>
                    <div className="p-3 border rounded" style={{ background: '#f8f9ff', borderColor: '#e2e6ff' }}>
                      <div className="text-uppercase fw-semibold" style={{ fontSize: '0.72rem', color: '#6c757d', letterSpacing: '0.05em' }}>
                        {item.label}
                      </div>
                      <div className="mt-1" style={{ fontSize: '0.82rem', color: '#1a1f36', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {item.value}
                      </div>
                    </div>
                  </CCol>
                ))}
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default SettingsPage;