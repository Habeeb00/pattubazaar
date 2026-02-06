import React from "react";

interface Props {
    selectionCount: number;
    sizeLabel?: string;
    onClear: () => void;
    onPurchase: () => void;
    disabled?: boolean;
}

export const GridToolbar: React.FC<Props> = ({
    selectionCount,
    sizeLabel,
    onClear,
    onPurchase,
    disabled = false,
}) => {
    return (
        <div className="flex gap-4 items-center p-3 bg-white border-4 border-gray-200 rounded-lg shadow-xl">
            <div className="px-2">
                <div className="text-sm font-bold text-gray-900 font-display">
                    <span className="text-gray-900 text-lg">{selectionCount}</span> slot{selectionCount !== 1 ? 's' : ''} selected
                </div>
                {sizeLabel && <div className="text-xs text-gray-500 font-medium font-mono">{sizeLabel}</div>}
            </div>
            <div className="ml-auto flex gap-2">
                <button
                    onClick={onClear}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-300 transition-colors border-2 border-gray-300 shadow-sm"
                >
                    Clear
                </button>
                <button
                    onClick={onPurchase}
                    disabled={selectionCount === 0 || disabled}
                    className="px-6 py-2 bg-[#FF007F] text-white text-xs font-bold uppercase tracking-wider border-4 border-[#FF69B4] shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Book Selected
                </button>
            </div>
        </div>
    );
};
