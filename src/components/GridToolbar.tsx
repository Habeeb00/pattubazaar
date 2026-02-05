import React from "react";

interface Props {
    selectionCount: number;
    sizeLabel?: string;
    onClear: () => void;
    onPurchase: () => void;
}

export const GridToolbar: React.FC<Props> = ({
    selectionCount,
    sizeLabel,
    onClear,
    onPurchase,
}) => {
    return (
        <div className="flex gap-4 items-center p-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-2">
                <div className="text-sm font-bold text-gray-800">
                    <span className="text-blue-600">{selectionCount}</span> slot{selectionCount !== 1 ? 's' : ''} selected
                </div>
                {sizeLabel && <div className="text-xs text-gray-500 font-medium">{sizeLabel}</div>}
            </div>
            <div className="ml-auto flex gap-2">
                <button
                    onClick={onClear}
                    className="px-4 py-2 bg-white text-gray-600 text-sm font-semibold border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm"
                >
                    Clear
                </button>
                <button
                    onClick={onPurchase}
                    disabled={selectionCount === 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 disabled:shadow-none"
                >
                    Book Selected
                </button>
            </div>
        </div>
    );
};
