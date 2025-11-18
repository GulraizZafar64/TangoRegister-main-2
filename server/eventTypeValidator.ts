/**
 * Type validator and converter for Event data
 * Ensures all fields match the database schema types
 */

export function sanitizeEventData(eventData: any): any {
  const sanitized: any = {};

  // Copy all fields first, then sanitize specific ones
  Object.keys(eventData).forEach(key => {
    if (eventData[key] !== undefined) {
      sanitized[key] = eventData[key];
    }
  });

  // Debug: Log text date fields before sanitization
  const textDateFields = [
    'workshopEarlyBirdEndDate',
    'fullPackageEarlyBirdEndDate', 'fullPackage24HourStartDate', 'fullPackage24HourEndDate',
    'eveningPackageEarlyBirdEndDate', 'eveningPackage24HourStartDate', 'eveningPackage24HourEndDate',
    'premiumAccommodation4NightsEarlyBirdEndDate',
    'premiumAccommodation3NightsEarlyBirdEndDate'
  ];
  
  const dateFieldsToLog: any = {};
  textDateFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      dateFieldsToLog[field] = {
        value: sanitized[field],
        type: typeof sanitized[field],
        isDate: sanitized[field] instanceof Date
      };
    }
  });
  if (Object.keys(dateFieldsToLog).length > 0) {
    console.log('Text date fields before sanitization:', JSON.stringify(dateFieldsToLog, null, 2));
  }

  // Timestamp fields - must be Date objects
  const timestampFields = [
    'startDate', 'endDate', 'registrationOpenDate', 'registrationCloseDate',
    'createdAt', 'updatedAt'
  ];
  
  timestampFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      if (sanitized[field] instanceof Date) {
        // Already a Date, keep it
      } else if (typeof sanitized[field] === 'string' && sanitized[field].trim() !== '') {
        sanitized[field] = new Date(sanitized[field]);
      } else if (sanitized[field] === null || sanitized[field] === '') {
        // Only allow null for optional timestamp fields
        if (field !== 'createdAt' && field !== 'updatedAt') {
          sanitized[field] = null;
        }
      }
    }
  });

  // Text date fields - must be strings (ISO format) or null
  // (reusing the same array defined above for debug logging)

  textDateFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      const value = sanitized[field];
      
      // Handle null or empty
      if (value === null || value === '' || value === undefined) {
        sanitized[field] = null;
      }
      // Handle Date objects
      else if (value instanceof Date) {
        sanitized[field] = value.toISOString();
      }
      // Handle strings - validate and clean
      else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
          sanitized[field] = null;
        } else {
          // Try to parse as date to validate, then convert back to ISO string
          try {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
              sanitized[field] = date.toISOString();
            } else {
              // Invalid date string, keep as-is but log warning
              console.warn(`Invalid date format for ${field}: ${trimmed}`);
              sanitized[field] = trimmed;
            }
          } catch {
            sanitized[field] = trimmed;
          }
        }
      }
      // Handle numbers (timestamps)
      else if (typeof value === 'number') {
        const date = new Date(value);
        sanitized[field] = date.toISOString();
      }
      // Convert anything else to string, then try to parse as date
      else {
        const str = String(value);
        try {
          const date = new Date(str);
          if (!isNaN(date.getTime())) {
            sanitized[field] = date.toISOString();
          } else {
            sanitized[field] = str;
          }
        } catch {
          sanitized[field] = str;
        }
      }
    }
  });

  // Decimal/price fields - must be strings
  const priceFields = [
    'workshopStandardPrice', 'workshopEarlyBirdPrice',
    'fullPackageStandardPrice', 'fullPackageEarlyBirdPrice', 'fullPackage24HourPrice',
    'eveningPackageStandardPrice', 'eveningPackageEarlyBirdPrice', 'eveningPackage24HourPrice',
    'premiumAccommodation4NightsSinglePrice', 'premiumAccommodation4NightsDoublePrice',
    'premiumAccommodation4NightsEarlyBirdSinglePrice', 'premiumAccommodation4NightsEarlyBirdDoublePrice',
    'premiumAccommodation3NightsSinglePrice', 'premiumAccommodation3NightsDoublePrice',
    'premiumAccommodation3NightsEarlyBirdSinglePrice', 'premiumAccommodation3NightsEarlyBirdDoublePrice'
  ];

  priceFields.forEach(field => {
    if (eventData[field] !== undefined && eventData[field] !== null) {
      sanitized[field] = String(eventData[field]);
    }
  });

  // Boolean fields
  if (eventData.isActive !== undefined) {
    sanitized.isActive = Boolean(eventData.isActive);
  }
  if (eventData.isCurrent !== undefined) {
    sanitized.isCurrent = Boolean(eventData.isCurrent);
  }

  // String fields - only override if they exist
  if (eventData.name !== undefined) sanitized.name = String(eventData.name);
  if (eventData.venue !== undefined) sanitized.venue = String(eventData.venue);
  if (eventData.description !== undefined) {
    sanitized.description = eventData.description === null || eventData.description === '' 
      ? null 
      : String(eventData.description);
  }
  if (eventData.year !== undefined) sanitized.year = Number(eventData.year);
  if (eventData.id !== undefined) sanitized.id = String(eventData.id);

  // Remove undefined values
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });

  // Debug: Log text date fields after sanitization
  const dateFieldsAfterLog: any = {};
  textDateFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      dateFieldsAfterLog[field] = {
        value: sanitized[field],
        type: typeof sanitized[field]
      };
    }
  });
  if (Object.keys(dateFieldsAfterLog).length > 0) {
    console.log('Text date fields after sanitization:', JSON.stringify(dateFieldsAfterLog, null, 2));
  }

  return sanitized;
}

