import React from 'react';
import { FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

const ComplianceChecks = ({ data }) => {
  const getStatusIcon = (status) => {
    switch(status) {
      case 'PASS': return <FiCheckCircle className="text-green-600 dark:text-green-400 text-lg" />;
      case 'WARNING': return <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 text-lg" />;
      case 'FAIL': return <FiXCircle className="text-red-600 dark:text-red-400 text-lg" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PASS: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      WARNING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      FAIL: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`;
  };

  return (
    <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-[#e2e8f0] dark:border-[#334155] overflow-hidden">
      <div className="px-5 py-3 bg-[#f8fafc] dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155]">
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wide">
          Eurocode 2 Compliance Checks
        </h3>
      </div>
      <div className="p-5">
        <div className="space-y-3">
          {data.map((check, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#1e293b] rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(check.status)}
                <div>
                  <p className="text-sm font-medium text-[#0F172A] dark:text-white">{check.check}</p>
                  {check.note && (
                    <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">{check.note}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">Ratio: </span>
                  <span className={`text-sm font-mono font-bold ${
                    check.ratio <= check.limit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {check.ratio.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#64748b] dark:text-[#94a3b8]"> / {check.limit.toFixed(1)}</span>
                </div>
                <span className={getStatusBadge(check.status)}>{check.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComplianceChecks;