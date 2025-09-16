import React from 'react';

/**
 * Component to display a status badge with appropriate styling based on status
 * @param {Object} props - Component props
 * @param {string} props.status - Status string ('early', 'late', 'on-time', etc.)
 * @returns {JSX.Element} Styled status badge
 */
function StatusBadge({ status }) {
  // Define color scheme based on status
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-700';
  let label = status;

  switch (status) {
    case 'early':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-700';
      label = 'Early';
      break;
    case 'late':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-700';
      label = 'Late';
      break;
    case 'on-time':
      bgColor = 'bg-green-100';
      textColor = 'text-green-700';
      label = 'On Time';
      break;
    case 'not-checked-in':
      bgColor = 'bg-red-100';
      textColor = 'text-red-700';
      label = 'Not Checked In';
      break;
    default:
      // Use default gray styling
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}

export default StatusBadge; 