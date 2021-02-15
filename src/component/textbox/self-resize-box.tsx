import { useEffect, useRef } from 'react';
import { TextBoxFontSize } from '../../model';
import { quoteConvert, scaleCalc } from '../../util';
import './textbox.scss';

const createCondenser = (minThreshold = 0, maxThreshold = 1000) => {
    let min = minThreshold;
    let max = maxThreshold;
    let median = max;
    let lastEffective = median;
    let iterateCount = 30;
    let magnitude = 100;

    const reverseSearch = () => {
        if (magnitude === 1) finish();
        else {
            median += magnitude;
            magnitude /= 10;
            median -= magnitude;
        }

        return Math.min(median, max);
    };

    const searchDown = () => {
        median -= magnitude;
        iterateCount -= 1;

        return median;
    };

    const reset = (minThreshold = min, maxThreshold = max) => {
        min = minThreshold;
        max = maxThreshold;
        median = maxThreshold;
        iterateCount = 30;
        magnitude = 100;
        lastEffective = maxThreshold;
    };

    const getMedian = () => median;
    const setMedian = (newMedian: number) => median = newMedian;
	
    const setLastEffective = (forceMedian = median) => lastEffective = forceMedian;
    const getLastEffective = () => lastEffective;
    const applyLastEffective = () => {
        median = lastEffective;
        iterateCount = -1;
        return median;
    };
	
    const getIterateCount = () => iterateCount;
    const finish = () => iterateCount = -1;

    return {
        reset,
        searchDown,
        reverseSearch,
        finish,
        getMedian,
        setMedian,
        setLastEffective,
        getLastEffective,
        applyLastEffective,
        getIterateCount,
    };
};

export type SelfResizeBox = {
	value: string,
    fontList: TextBoxFontSize[],
	sizeData: { width: number, height: number },
	zoom: number,
}
export const SelfResizeBox = ({
    fontList,
    sizeData,
    value,
    zoom,
}: SelfResizeBox) => {
    const { height, width } = sizeData;
    const bodyContainerRef = useRef<HTMLDivElement>(null);
    const bodyMeasurerRef = useRef<HTMLDivElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);
    const headerMeasurerRef = useRef<HTMLDivElement>(null);
    const footerContainerRef = useRef<HTMLDivElement>(null);
    const footerMeasurerRef = useRef<HTMLDivElement>(null);
    const tokenRef = useRef({
        header: '',
        body: '',
        footer: '',
    });

    const isOverflow = (containerRef: HTMLDivElement | null, measurerRef: HTMLDivElement | null, offset = 0) => {
        if (containerRef && measurerRef) {
            // Container size is subjected to canvas zoom
            const { height: containerHeight } = containerRef.getBoundingClientRect();
            const { height: measurerHeight } = measurerRef.getBoundingClientRect();

            return measurerHeight + offset > containerHeight;
        }
        return false;
    };

    useEffect(() => {
        let relevant = true;
        const autoResize = (measurer: HTMLDivElement | null, fontEntry: TextBoxFontSize, overflowCheck: (measurer: HTMLDivElement) => boolean) => {
            console.log('🚀 ~ file: self-resize-box.tsx ~ line 107 ~ autoResize ~ measurer', measurer);
            let effective;
            const condenser = createCondenser();
            const resetMeasurer = (measurer: HTMLDivElement | null) => {
                if (measurer) {
                    measurer.style.transform = 'scaleX(1) translateX(0%)';
                    measurer.style.width =  '100%';
                }
            };
            const applyScale = (measurer: HTMLDivElement | null, median: number) => {
                if (measurer) {
                    const {
                        scaleRatio,
                        translatePercent,
                    } = scaleCalc(median, 1000);
                    measurer.style.transform = `scaleX(${scaleRatio}) translateX(${translatePercent})`;
                    measurer.style.width =  `${100 / scaleRatio}%`;
                }
            };
            if (relevant && measurer) {
                const {
                    fontSize,
                    lineHeight,
                } = fontEntry;
                measurer.style.fontSize = `${fontSize}px`;
                measurer.style.lineHeight = `${lineHeight}px`;
                resetMeasurer(measurer);

                while (condenser.getIterateCount() >= 0 && relevant) {
                    if (condenser.getIterateCount() === 0) {
                        // When out of iteration, return the concluded median
                        const effectiveMedian = condenser.applyLastEffective();
                        applyScale(measurer, effectiveMedian);
                        // effective = effectiveMedian;
                        // console.log('🚀 ~ file: self-resize-box.tsx ~ line 143 ~ autoResize ~ effective', effective);
                        break;
                    } else {
                        if (overflowCheck(measurer)) {
                            // If overflow, lower the median and apply it
                            const newMedian = condenser.searchDown();
                            effective = condenser.getLastEffective();
                            applyScale(measurer, newMedian);
                        } else {
                            condenser.setLastEffective();
                            const newMedian = condenser.reverseSearch();

                            condenser.setMedian(newMedian);
                            applyScale(measurer, newMedian);
                        }
                    }
                }
            }
            return effective;
        };
        const resize = async () => {
            fontList.some(fontEntry => {
                let offset = 0;
                let effectiveBodyRatio = 1000;
                const headerContainer = headerContainerRef.current;
                if (tokenRef.current.header && relevant) {
                    const headerMeasurer = headerMeasurerRef.current;
        
                    if (headerContainer) {
                        // Position hack, because if header's position is not absolute, the content inside will visibly overflow
                        // instead of extend container
                        headerContainer.style.position = 'absolute';
                        headerContainer.style.height = `${fontEntry.lineHeight}px`;
                        offset += fontEntry.lineHeight;
                    }
                    autoResize(headerMeasurer, fontEntry, (measurer) => isOverflow(headerContainer, measurer));
                    if (headerContainer) headerContainer.style.position = 'relative';
                } else {
                    if (headerContainer) headerContainer.style.height = '0';
                }

                const footerContainer = footerContainerRef.current;
                if (tokenRef.current.footer && relevant) {
                    const footerMeasurer = footerMeasurerRef.current;
        
                    if (footerContainer) {
                        footerContainer.style.height = `${fontEntry.lineHeight}px`;
                        offset += fontEntry.lineHeight;
                    }
                    autoResize(footerMeasurer, fontEntry, (measurer) => isOverflow(footerContainer, measurer));
                } else {
                    if (footerContainer) footerContainer.style.height = '0';
                }

                if (tokenRef.current.body && relevant) {
                    const bodyMeasurer = bodyMeasurerRef.current;
                    const bodyContainer = bodyContainerRef.current;

                    effectiveBodyRatio = autoResize(bodyMeasurer, fontEntry, (measurer) => isOverflow(bodyContainer, measurer, offset)) ?? 1000;
                }
                return effectiveBodyRatio >= 600;
            });
        };
        resize();

        return () => { relevant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    let trialValue = quoteConvert(value);

    const materialRegex = /^(\[([^\]]*)\]\s*)/m;
    const materialReplacement = materialRegex.exec(trialValue)?.[1];
    const material = materialRegex.exec(trialValue)?.[2];
    if (material && materialReplacement) {
        tokenRef.current.header = material;
        trialValue = trialValue.replace(materialReplacement, '');
    } else tokenRef.current.header = '';

    const flavorConditionRegex = /\n(^[\r\t\f\v \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*\([\w\W]+\))\s*$/m;
    const flavorCondition = flavorConditionRegex.exec(trialValue)?.[1];
    if (flavorCondition) {
        tokenRef.current.footer = flavorCondition;
        trialValue = trialValue.replace(flavorCondition, '');
    } else tokenRef.current.footer = '';

    tokenRef.current.body = trialValue;

    const {
        body,
        footer,
        header,
    } = tokenRef.current;
    return <div ref={bodyContainerRef}
        className="resize-box"
        style={{
            width: `${width}px`,
            height: `${height}px`,
            position: 'relative',
            zIndex: 100,
        }}
    >
        <div className="header" ref={headerContainerRef}>
            <div ref={headerMeasurerRef}>
                {header}
            </div>
        </div>
        <div className="body" ref={bodyMeasurerRef}>{body}</div>
        <div className="footer" ref={footerContainerRef}>
            <div ref={footerMeasurerRef}>
                {footer}
            </div>
        </div>
    </div>;
};