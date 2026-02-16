/**
 * Product Focus Selector Component
 * Select which part of the product to focus on
 */

import React from 'react';
import { User, Shirt, Armchair, Footprints, Watch, Target } from 'lucide-react';

const FOCUS_OPTIONS = [
  {
    value: 'full-outfit',
    label: 'Full Outfit',
    description: 'Toàn bộ trang phục',
    icon: User,
    recommended: true,
  },
  {
    value: 'top',
    label: 'Top (Áo)',
    description: 'Phần trên',
    icon: Shirt,
    recommended: false,
  },
  {
    value: 'bottom',
    label: 'Bottom (Quần/Váy)',
    description: 'Phần dưới',
    icon: Armchair,
    recommended: false,
  },
  {
    value: 'shoes',
    label: 'Shoes',
    description: 'Giày',
    icon: Footprints,
    recommended: false,
  },
  {
    value: 'accessories',
    label: 'Accessories',
    description: 'Phụ kiện',
    icon: Watch,
    recommended: false,
  },
  {
    value: 'specific-item',
    label: 'Specific Item',
    description: 'Món đồ cụ thể',
    icon: Target,
    recommended: false,
  },
];

export default function ProductFocusSelector({ selectedFocus, onFocusChange }) {
  return (
    <div className="product-focus-selector">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🎯 Chọn Khu Vực Tập Trung</h3>
        <p className="text-sm text-gray-500 mt-1">
          Xác định phần nào của sản phẩm cần tập trung hiển thị
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {FOCUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedFocus === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onFocusChange(option.value)}
              className={`
                relative p-4 rounded-xl border-2 transition-all text-left
                ${isSelected
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }
              `}
            >
              {/* Recommended badge */}
              {option.recommended && !isSelected && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center mb-3
                ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Label & Description */}
              <h4 className={`font-medium ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                {option.label}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Export focus options for other components
export { FOCUS_OPTIONS };
