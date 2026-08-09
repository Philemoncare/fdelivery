import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Bike, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const BecomeRiderPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [riderName, setRiderName] = useState('');
  const [vehicle, setVehicle] = useState('E-Bike');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast('Rider Application Submitted!', 'Verification details sent to your phone number.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3.5 py-1 rounded-full text-xs font-bold border border-blue-200">
          <Bike className="w-4 h-4" />
          <span>Fleet Rider Opportunities</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white">
          Deliver Orders & Earn on Your Own Schedule
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
          Set your own hours, pick your preferred delivery zones, and receive instant daily payouts with 100% customer tips.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-blue-500/30 text-center space-y-4 shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Application Received!</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Your rider profile is being processed. Download the rider app or click below to launch the rider dashboard.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow hover:bg-blue-700 transition"
          >
            Create Your Rider Account
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-3 border-gray-100 dark:border-slate-800">
            Rider Registration Form
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder="e.g. Kwabena Mensah"
                className="w-full bg-gray-50 dark:bg-slate-800 border p-3 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold block mb-1">Vehicle Type</label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border p-3 rounded-xl text-gray-900 dark:text-white"
                >
                  <option value="Bicycle">Bicycle</option>
                  <option value="E-Bike">E-Bike</option>
                  <option value="Scooter / Moped">Scooter / Moped</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Cargo Car">Cargo Car / Van</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Driver License / ID #</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-8834201"
                  className="w-full bg-gray-50 dark:bg-slate-800 border p-3 rounded-xl text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-4 rounded-xl transition shadow-xl"
            >
              Submit Rider Registration
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
