import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from './services/api';
import PageTitle from './components/PageTitle';
import {
  Package, Truck, Search, CheckCircle, XCircle, Clock, 
  ArrowLeft, ExternalLink, RotateCcw
} from 'lucide-react';

const FanCourierTestPage = () => {
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  // Test data form
  const [testData, setTestData] = useState({
    recipientName: 'Test Customer',
    recipientPhone: '0700123456',
    recipientEmail: 'test@example.com',
    city: 'Cluj-Napoca',
    county: 'Cluj',
    street: 'Strada Memorandumului',
    streetNumber: '28',
    postalCode: '400114',
    weight: 1,
    declaredValue: 100,
    cashOnDelivery: 0,
    contents: 'Test package'
  });

  const [trackingAwb, setTrackingAwb] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTestData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const runCompleteTest = async () => {
    setLoading(true);
    setError('');
    setTestResult(null);

    try {
      const result = await apiService.testFanCourierIntegration(testData);
      setTestResult(result);
    } catch (error) {
      setError(error.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const trackAWB = async () => {
    if (!trackingAwb.trim()) {
      alert('Introduceți numărul AWB');
      return;
    }

    setTrackingLoading(true);
    setTrackingResult(null);

    try {
      const result = await apiService.trackTestAWB(trackingAwb.trim());
      setTrackingResult(result);
    } catch (error) {
      setTrackingResult({
        success: false,
        error: error.message
      });
    } finally {
      setTrackingLoading(false);
    }
  };

  const getStepIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageTitle title="Test FAN Courier Integration" />
      
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Înapoi acasă
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="w-8 h-8 mr-3 text-blue-600" />
            Test FAN Courier Integration
          </h1>
          <p className="text-gray-600 mt-2">
            Testează integrarea cu API-ul FAN Courier pentru crearea AWB-urilor și urmărirea coletelor.
          </p>
        </div>

        {/* Test Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Date pentru test
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nume destinatar
              </label>
              <input
                type="text"
                name="recipientName"
                value={testData.recipientName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <input
                type="text"
                name="recipientPhone"
                value={testData.recipientPhone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Oraș
              </label>
              <input
                type="text"
                name="city"
                value={testData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Județ
              </label>
              <input
                type="text"
                name="county"
                value={testData.county}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresa
              </label>
              <input
                type="text"
                name="street"
                value={testData.street}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cod poștal
              </label>
              <input
                type="text"
                name="postalCode"
                value={testData.postalCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Greutate (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={testData.weight}
                onChange={handleInputChange}
                min="0.1"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valoare declarată (RON)
              </label>
              <input
                type="number"
                name="declaredValue"
                value={testData.declaredValue}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={runCompleteTest}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Clock className="w-5 h-5 animate-spin mr-2" />
                Se rulează testul...
              </>
            ) : (
              <>
                <Package className="w-5 h-5 mr-2" />
                Rulează test complet
              </>
            )}
          </button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Rezultate test
            </h2>

            <div className="space-y-4 mb-6">
              {testResult.steps.map((step) => (
                <div key={step.step} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                  {getStepIcon(step.status)}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Pasul {step.step}: {step.name}
                    </div>
                    {step.status === 'success' && step.awbNumber && (
                      <div className="text-sm text-green-600">
                        AWB: {step.awbNumber} | Cost: {step.cost} RON | Total: {step.totalCost} RON
                      </div>
                    )}
                    {step.status === 'failed' && step.error && (
                      <div className="text-sm text-red-600">
                        Eroare: {step.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={`p-4 rounded-lg ${
              testResult.overall.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`flex items-center ${
                testResult.overall.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.overall.success ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                <span className="font-medium">{testResult.overall.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* AWB Tracking */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Urmărire AWB
          </h2>

          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={trackingAwb}
              onChange={(e) => setTrackingAwb(e.target.value)}
              placeholder="Introduceți numărul AWB (ex: 7000080277287)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={trackAWB}
              disabled={trackingLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {trackingLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Urmărește
            </button>
          </div>

          {trackingResult && (
            <div className={`p-4 rounded-lg ${
              trackingResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {trackingResult.success ? (
                <div>
                  <div className="text-green-800 font-medium mb-2">
                    AWB: {trackingResult.awbNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: {trackingResult.tracking?.status || 'În procesare'}
                  </div>
                  {trackingResult.tracking?.history && (
                    <div className="mt-3 text-sm">
                      <div className="font-medium text-gray-700 mb-1">Istoric:</div>
                      <div className="space-y-1">
                        {trackingResult.tracking.history.map((event, index) => (
                          <div key={index} className="text-gray-600">
                            {event.date}: {event.status}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-800">
                  Eroare: {trackingResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FanCourierTestPage;