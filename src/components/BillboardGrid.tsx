import React, {
    useMemo,
    useState,
    useEffect,
    useCallback,
    useRef,
    useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import type { Ad } from "../types";

const GRID_COLS = 10;
const GRID_ROWS = 10;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

// --- Helper Functions ---
const parsePlotId = (plotId: string): [number, number] => {
    return plotId.split("-").map(Number) as [number, number];
};

const getAdBoundingBox = (ad: Ad) => {
    const plots = ad.plots.map(parsePlotId);
    const rows = plots.map(([r]) => r);
    const cols = plots.map(([, c]) => c);
    const minR = Math.min(...rows);
    const maxR = Math.max(...rows);
    const minC = Math.min(...cols);
    const maxC = Math.max(...cols);
    return {
        gridRowStart: minR + 1,
        gridColumnStart: minC + 1,
        gridRowEnd: `span ${maxR - minR + 1}`,
        gridColumnEnd: `span ${maxC - minC + 1}`,
    } as React.CSSProperties;
};

// --- Tooltip Component (with Portal) ---
const AdTooltip = ({ ad, rect }: { ad: Ad; rect: DOMRect }) => {
    const portalRoot = document.getElementById("tooltip-root");
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({
        opacity: 0,
        pointerEvents: "none",
    });
    const [arrowClasses, setArrowClasses] = useState("");

    const aspectRatio = useMemo(() => {
        const plots = ad.plots.map(parsePlotId);
        const rows = plots.map(([r]) => r);
        const cols = plots.map(([, c]) => c);
        const minR = Math.min(...rows);
        const maxR = Math.max(...rows);
        const minC = Math.min(...cols);
        const maxC = Math.max(...cols);
        const width = maxC - minC + 1;
        const height = maxR - minR + 1;
        return width / height;
    }, [ad.plots]);

    useLayoutEffect(() => {
        if (!rect || !tooltipRef.current || !portalRoot) return;

        const tooltipNode = tooltipRef.current;
        const { innerWidth } = window;
        const tooltipRect = tooltipNode.getBoundingClientRect();

        const margin = 10;
        let top = rect.top - tooltipRect.height - margin;
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

        let newArrowClasses =
            "absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent";

        if (top < margin) {
            top = rect.bottom + margin;
            newArrowClasses += " bottom-full border-b-8 border-b-gray-900 rotate-180";
        } else {
            newArrowClasses += " top-full border-t-8 border-t-gray-900";
        }
        setArrowClasses(newArrowClasses);

        if (left < margin) {
            left = margin;
        }
        if (left + tooltipRect.width > innerWidth - margin) {
            left = innerWidth - tooltipRect.width - margin;
        }

        setStyle({
            position: "fixed",
            top: `${top}px`,
            left: `${left}px`,
            zIndex: 50,
            opacity: 1,
            transition: "opacity 0.2s",
            pointerEvents: "none",
        });
    }, [ad, rect, portalRoot]);

    if (!portalRoot) return null;

    return createPortal(
        <div
            ref={tooltipRef}
            style={style}
            className="w-56 p-3 bg-gray-900 border-4 border-gray-700 text-white text-center text-xs relative shadow-2xl"
        >
            <img
                src={ad.imageUrl}
                alt={ad.message}
                className="w-full object-cover border-2 border-gray-700 mb-2 rounded-sm"
                style={{ aspectRatio: aspectRatio }}
            />
            <p className="font-bold break-words text-sm font-display">
                {ad.message}
            </p>
            {ad.venueName && (
                <p className="text-xs text-gray-400 mt-1">by {ad.venueName}</p>
            )}
            <div className={arrowClasses}></div>
        </div>,
        portalRoot,
    );
};

// --- Sub-components ---
interface PurchasedAdProps {
    ad: Ad;
    isAdmin: boolean;
    isBooked: boolean;
    isSelected: boolean;
    onDeleteAd: (adId: string) => void;
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>, ad: Ad) => void;
    onMouseLeave: () => void;
    onMouseDown: (plotId: string) => void;
    isHovered: boolean;
}

const PurchasedAd: React.FC<PurchasedAdProps> = ({
    ad,
    isAdmin,
    isBooked,
    isSelected,
    onDeleteAd,
    onMouseEnter,
    onMouseLeave,
    onMouseDown,
    isHovered,
}) => {
    const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onDeleteAd(ad.id);
    };

    const handleLinkClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (ad.link) {
            window.open(ad.link, "_blank", "noopener,noreferrer");
        }
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isBooked) {
            e.preventDefault();
            onMouseDown(ad.plots[0]);
        }
    };

    return (
        <div
            className={`relative group bg-black border border-slate-700/50 ${!isBooked ? 'cursor-pointer' : 'cursor-not-allowed'
                } ${isSelected ? 'outline outline-2 outline-green-400 outline-offset-[-2px]' : ''}`}
            style={getAdBoundingBox(ad)}
            onMouseEnter={(e) => onMouseEnter(e, ad)}
            onMouseLeave={onMouseLeave}
            onMouseDown={handleClick}
            aria-label={`Ad: ${ad.message}`}
        >
            <img src={ad.imageUrl} alt={ad.message} className="w-full h-full object-cover" />

            {/* Darker overlay for booked slots */}
            {isBooked && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-none">
                    <div className="bg-[#FF007F] text-white px-2 py-0.5 text-[8px] sm:text-[10px] font-bold border-2 border-[#FF69B4] rotate-[-15deg] shadow-[0_0_10px_rgba(255,0,127,0.6)]">
                        BOOKED
                    </div>
                </div>
            )}

            {isHovered && !isAdmin && ad.link && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 transition-opacity">
                    <button
                        onClick={handleLinkClick}
                        className="bg-[#FF007F] text-white px-4 py-2 text-xs font-bold border border-white/20 shadow-[0_4px_10px_rgba(255,0,127,0.5)] hover:bg-[#ff3399] transition-all rounded-full uppercase tracking-wider"
                    >
                        Visit
                    </button>
                </div>
            )}

            {isHovered && isAdmin && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2 z-10 gap-2">
                    <p className="text-white text-xs text-center truncate max-w-full px-2">{ad.message}</p>
                    {ad.link && (
                        <button
                            onClick={handleLinkClick}
                            className="bg-gradient-to-b from-blue-500 to-blue-700 text-white border-4 border-blue-400 px-3 py-1 text-xs font-bold hover:from-blue-600 hover:to-blue-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px]"
                        >
                            🔗 Visit Link
                        </button>
                    )}
                    <button
                        onClick={handleDeleteClick}
                        className="bg-gradient-to-b from-red-500 to-red-700 text-white border-4 border-red-400 px-3 py-1 text-xs font-bold hover:from-red-600 hover:to-red-800 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                        Unbook
                    </button>
                </div>
            )}
        </div>
    );
};

interface EmptyPlotProps {
    plotId: string;
    isSelected: boolean;
    onMouseDown: (plotId: string) => void;
    onMouseEnter: () => void;
}

const EmptyPlot: React.FC<EmptyPlotProps> = ({ plotId, isSelected, onMouseDown, onMouseEnter }) => {
    const baseClasses = "relative z-10 w-full h-full transition-colors bg-white/5 hover:bg-white/20 cursor-pointer border border-white/5";
    const selectedClasses = "bg-green-500/50 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.5)] z-20";

    return (
        <div
            onMouseDown={(e) => {
                e.preventDefault();
                onMouseDown(plotId);
            }}
            onMouseEnter={onMouseEnter}
            className={`${baseClasses} ${isSelected ? selectedClasses : ""}`}
            aria-label={`Book slot ${plotId}`}
        ></div>
    );
};

// --- Main Component ---
interface BillboardGridProps {
    ads: Ad[];
    selectedPlots: string[];
    setSelectedPlots: (plots: string[]) => void;
    purchasedPlotIds: Set<string>;
    isAdmin: boolean;
    onDeleteAd: (adId: string) => void;
}

export function BillboardGrid({
    ads,
    selectedPlots,
    setSelectedPlots,
    purchasedPlotIds,
    isAdmin,
    onDeleteAd,
}: BillboardGridProps) {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const selectedPlotsSet = useMemo(() => new Set(selectedPlots), [selectedPlots]);

    const [tooltip, setTooltip] = useState<{ ad: Ad; rect: DOMRect } | null>(null);

    const handleMouseDown = useCallback(
        (plotId: string) => {
            // Allow selecting any slot, even if it's filled
            setSelectedPlots([plotId]);
        },
        [setSelectedPlots]
    );

    const handleMouseEnter = useCallback(
        () => {
            // Disable drag selection - do nothing on mouse enter
            return;
        },
        []
    );

    const adDataMap = useMemo(() => {
        const map = new Map<string, { ad: Ad; isTopLeft: boolean }>();
        ads.forEach((ad) => {
            const topLeftPlotId = ad.plots[0];
            ad.plots.forEach((plotId) => {
                map.set(plotId, { ad, isTopLeft: plotId === topLeftPlotId });
            });
        });
        return map;
    }, [ads]);

    const handleShowTooltip = useCallback((e: React.MouseEvent<HTMLDivElement>, ad: Ad) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ ad, rect });
    }, []);

    const handleHideTooltip = useCallback(() => setTooltip(null), []);

    // Keyboard navigation & selection
    const [focusedCell, setFocusedCell] = useState<string | null>(null);
    useEffect(() => {
        const el = gridRef.current;
        if (!el) return;
        const handleKey = (e: KeyboardEvent) => {
            if (!focusedCell) return;

            const [r, c] = focusedCell.split("-").map(Number);
            let nextR = r;
            let nextC = c;

            if (e.key === "ArrowUp") nextR = Math.max(0, r - 1);
            if (e.key === "ArrowDown") nextR = Math.min(GRID_ROWS - 1, r + 1);
            if (e.key === "ArrowLeft") nextC = Math.max(0, c - 1);
            if (e.key === "ArrowRight") nextC = Math.min(GRID_COLS - 1, c + 1);

            const newPlot = `${nextR}-${nextC}`;
            if (newPlot === focusedCell) return;

            // Single slot selection only - no Shift+Arrow multi-select
            if (e.key === "Enter") {
                // Allow selecting any slot
                if (selectedPlots.includes(newPlot)) {
                    setSelectedPlots([]);
                } else {
                    setSelectedPlots([newPlot]);
                }
            } else if (e.key === "Escape") {
                setSelectedPlots([]);
            }

            setFocusedCell(newPlot);
            e.preventDefault();
        };

        el.addEventListener("keydown", handleKey);
        return () => el.removeEventListener("keydown", handleKey);
    }, [focusedCell, selectedPlots, setSelectedPlots, purchasedPlotIds]);
    return (
        <>
            {/* Grid */}
            <div
                ref={gridRef}
                role="grid"
                tabIndex={0}
                aria-label="Billboard selection grid"
                className="w-full max-w-[600px] aspect-square bg-transparent grid grid-cols-10 grid-rows-10 gap-[1px] overflow-visible p-1"
            >
                {Array.from({ length: TOTAL_CELLS }).map((_, index) => {
                    const row = Math.floor(index / GRID_COLS);
                    const col = index % GRID_COLS;
                    const plotId = `${row}-${col}`;

                    const plotAdInfo = adDataMap.get(plotId);

                    if (plotAdInfo) {
                        if (plotAdInfo.isTopLeft) {
                            return (
                                <PurchasedAd
                                    key={plotAdInfo.ad.id}
                                    ad={plotAdInfo.ad}
                                    isAdmin={isAdmin}
                                    isBooked={purchasedPlotIds.has(plotId)}
                                    isSelected={selectedPlotsSet.has(plotId)}
                                    onDeleteAd={onDeleteAd}
                                    onMouseEnter={handleShowTooltip}
                                    onMouseLeave={handleHideTooltip}
                                    onMouseDown={handleMouseDown}
                                    isHovered={tooltip?.ad.id === plotAdInfo.ad.id}
                                />
                            );
                        }
                        return null;
                    } else {
                        return (
                            <div
                                key={plotId}
                                role="gridcell"
                                aria-selected={selectedPlotsSet.has(plotId)}
                                tabIndex={-1}
                                onMouseDown={() => handleMouseDown(plotId)}
                                onMouseEnter={handleMouseEnter}
                                onFocus={() => {
                                    /* keep keyboard focus tracking */
                                }}
                                className={`${selectedPlotsSet.has(plotId)
                                    ? "z-20"
                                    : ""
                                    }`}
                            >
                                <EmptyPlot
                                    plotId={plotId}
                                    isSelected={selectedPlotsSet.has(plotId)}
                                    onMouseDown={handleMouseDown}
                                    onMouseEnter={handleMouseEnter}
                                />
                            </div>
                        );
                    }
                })}
            </div>

            {tooltip && <AdTooltip ad={tooltip.ad} rect={tooltip.rect} />}
        </>
    );
}
