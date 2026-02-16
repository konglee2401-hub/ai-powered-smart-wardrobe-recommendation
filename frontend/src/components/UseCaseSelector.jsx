/**
 * Use Case Selector Component
 * Select content use case for image generation
 */

import React from 'react';
import { Shirt, ShoppingBag, Share2, Camera, Home, GitCompare } from 'lucide-react';

const USE_CASES = [
  {
    value: 'change-clothes',
    label: 'Change Clothes',
    description: 'Mặc sản phẩm lên người mẫu',
    icon: Shirt,
    color: 'bg-blue-500',
  },
  {
    value: 'ecommerce-product',
    label: 'E-commerce Product Shot',
    description: 'Ảnh sản phẩm thương mại',
    icon: ShoppingBag,
    color: 'bg-green-500',
  },
  {
    value: 'social-media',
    label: 'Social Media Post',
    description: 'Bài đăng mạng xã hội',
    icon: Share2,
    color: 'bg-pink-500',
  },
  {
    value: 'fashion-editorial',
    label: 'Fashion Editorial',
    description: 'Bài báo thời trang chuyên nghiệp',
    icon: Camera,
    color: 'bg-purple-500',
  },
  {
    value: 'lifestyle-scene',
    label: 'Lifestyle Scene',
    description: 'Cảnh sống hàng ngày',
    icon: Home,
    color: 'bg-orange-500',
  },
  {
    value: 'before-after',
    label: 'Before/After Comparison',
    description: 'So sánh trước/sau',
    icon: GitCompare,
    color: 'bg-teal-500',
  },
];

export default function UseCaseSelector({ selectedUseCase, onUseCaseChange }) {
  return (
    <div className="use-case-selector">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🎯 Chọn Mục Đích Nội Dung</h3>
        <p className="text-sm text-gray-500 mt-1">
          Chọn mục đích sử dụng để AI tối ưu hóa kết quả
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {USE_CASES.map((useCase) => {
          const Icon = useCase.icon;
          const isSelected = selectedUseCase === useCase.value;

          return (
            <button
              key={useCase.value}
              onClick={() => onUseCaseChange(useCase.value)}
              className={`
                relative p-4 rounded-xl border-2 transition-all text-left
                ${isSelected
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }
              `}
            >
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
                ${isSelected ? useCase.color + ' text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Label & Description */}
              <h4 className={`font-medium ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                {useCase.label}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {useCase.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Export use cases for other components
export { USE_CASES };
