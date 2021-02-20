import React, { useEffect, useRef, useState } from 'react';
import './app.scss';
import 'antd/dist/antd.css';
import { Button, Col, Input, InputNumber, Radio, Row, Select, Slider } from 'antd';
import {
    Card,
    CardFamily,
    defaultCard,
    defaultCardFamily,
    defaultMonster,
    defaultMonsterCardType,
    defaultSpell,
    defaultTrap,
    defaultTypeAbilityList,
    ScaleValue,
    sequentialTypeAbility,
} from './model';
import { debounce } from 'lodash';
import {
    AttributeIcon,
    CardFrame,
    CardPicture,
    defaultMonsterFontList,
    defaultSTFontList,
    ImageCropper,
    LinkMarkChooser,
    LinkMarker,
    Star,
    STSubFamily,
    TextBox,
    TextBoxTitle,
    TypeAbilityLine,
} from './component';
import { checkLink, checkMonster, checkNormal, checkPendulum, checkXyz, scaleCalc } from './util';
import { ExtractProps } from './type';
import html2canvas from 'html2canvas';
import { defaultMonsterSizeList, defaultSTSizeList } from './component/textbox';

const { TextArea } = Input;
const { Option } = Select;
type SelectValue = Parameters<NonNullable<ExtractProps<typeof Select>['onChange']>>[0];
type RadioChangeEvent = Parameters<NonNullable<ExtractProps<typeof Radio>['onChange']>>[0];




const defaultZoomScaleRatio = 100;
const defaultScale: Record<string, ScaleValue> = {
    zoom: {
        scaleRatio: 1,
        translatePercent: '0%',
    },
    effect: {
        scaleRatio: 1,
        translatePercent: '0%',
    },
};
const onChangeFactory = (
    key: string,
    mutateFunction: (func: (card: Card) => Card) => void,
    valueTransform: (value: any) => any = (value) => value,
) => {
    return (e: any) => {
        mutateFunction(current => ({
            ...current,
            [key]: valueTransform(typeof e === 'string' || Array.isArray(e) ? e : e?.target?.value),
        }));
    };
};
const prepareCanvas = async () => {
    const findEl = document.getElementById('card-capture-container');
    if (findEl !== null) return html2canvas(findEl, { scrollX: 0, scrollY: -window.scrollY });
    else return null;
};
function App() {
    const [, setRefresh] = useState(0);
    const refresh = (message?: string | number) => {
        if (message !== undefined) console.log(message);
        setRefresh(cur => cur + 1);
    };

    const [isPreparing, setPreparing] = useState(false);
    const prepareForExport = () => {
        $onZoomChange(100);
        setPreparing(true);
    };
    useEffect(() => {
        (async () => {
            if (isPreparing) {
                const canvas = await prepareCanvas();
                
                if (canvas) {
                    const link = document.createElement('a');
                    document.body.appendChild(link);
                    link.download = 'cmp-image.png';
                    link.href = canvas.toDataURL();
                    link.click();
                    link.remove();
                } else alert('Could not export');
                $onZoomChange(50);
                setPreparing(false);
            }
        })();
    }, [isPreparing]);

    const [selectedPage, setPage] = useState<CardFamily>('Monster');
    const [currentCardPage, setCardPage] = useState<Record<string, Card>>({
        Monster: defaultMonster,
        Spell: defaultSpell,
        Trap: defaultTrap,
    });
    const setCard = (mutateFunc: (card: Card) => Card) => setCardPage(cur => {
        return {
            ...cur,
            [selectedPage]: mutateFunc(cur[selectedPage]),
        };
    });
    const [zoomValue, setZoom] = useState({
        scaleRatio: 1,
        translatePercent: '0%',
    });
    const [scaleValue, setScaleValue] = useState({
        effect: defaultScale,
    });
    const cardRef = useRef({
        effectLine: 0,
        pendulumEffectLine: 0,
    });
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const $onZoomChange = (value: number) => setZoom(scaleCalc(value, 100));
    const onZoomChange = debounce($onZoomChange, 100);

    const onFamilyChange = (e: RadioChangeEvent) => setPage(e.target.value as CardFamily);
    const onAttributeChange = onChangeFactory('attribute', setCard);
    const onSubFamilyChange = onChangeFactory('subFamily', setCard);
    const onNameChange = onChangeFactory('name', setCard);
    const onStarChange = (value: string | number | undefined) => setCardPage(cur => {
        return {
            ...cur,
            [selectedPage]: { ...cur[selectedPage], star: parseInt(`${value ?? 0}`) },
        };
    });
    const onScaleChange = onChangeFactory('pendulum_scale', setCard);
    const onPictureChange = onChangeFactory('picture', setCard);
    const onLinkMapChange = onChangeFactory('link_map', setCard);
    const onEffectChange = onChangeFactory('effect', setCard);
    const onATKChange = onChangeFactory('atk', setCard);
    const onDEFChange = onChangeFactory('def', setCard);
    const onTypeAbilityChange = (value: (string | number)[]) => {
        setCard(current => ({
            ...current,
            type_ability: value.map(entry => `${entry}`),
        }));
    };

    useEffect(() => {
        $onZoomChange(defaultZoomScaleRatio);
    }, []);

    const {
        scaleRatio
    } = zoomValue;
    const currentCard = currentCardPage[selectedPage];
    const {
        family,
        name,
        picture,
        effect,
        type_ability,
        pendulum_scale,
        atk, def, link_map,
        attribute,
        subFamily,
        star,
    } = currentCard;
    console.log('🚀 ~ file: app.tsx ~ line 177 ~ App ~ pendulum_scale', pendulum_scale);
    const {
        attribute: familyAttributeList,
        name: familyName,
        subFamily: subFamilyList,
    } = defaultCardFamily[family];
    const isNormal = checkNormal(currentCard);
    const isXyz = checkXyz(currentCard);
    const isLink = checkLink(currentCard);
    const isMonster = checkMonster(currentCard);
    const isPendulum = checkPendulum(currentCard);
    const {
        effectLine,
        pendulumEffectLine,
    } = cardRef.current;
    const effectSize = isMonster
        ? effectLine > 6 ? 'small' : 'normal'
        : effectLine > 8 ? 'small' : 'normal';
    const pendulumSize = pendulumEffectLine <= 3
        ? 'small'
        : 'medium';
    
    return (
        <div className={`app-container ${isPreparing ? 'app-container-export' : ''}`} style={{
            '--zoom-ratio': zoomValue.scaleRatio,
            '--translate-percent': zoomValue.translatePercent,
        } as any}>
            <div className="card-filter-panel">
    Card filter here
            </div>
            <div className="card-info-panel">
                <div className="card-info-line">
                    <Radio.Group key="family" className="family-radio" value={family} onChange={onFamilyChange}>
                        {Object.keys(defaultCardFamily).map(entry => <Radio.Button key={entry} value={entry}>{entry}</Radio.Button>)}
                    </Radio.Group>
                    <Input key="name" addonBefore="Name" placeholder="Card Name" value={name} onChange={onNameChange} />
                </div>
                <hr />
                <div className="card-info-line custom-gap">
                    <div className="card-info-sub-family">
                        {family === 'Monster'
                            ? isLink
                                ? null
                                : <div>
                                    {isXyz ? 'Rank' : 'Level'}: <InputNumber key="level-rank" min={0} max={13} value={star} onChange={onStarChange} />
                                </div>
                            : <Radio.Group key="subFamily" value={subFamily} onChange={onSubFamilyChange}>
                                {subFamilyList.map(entry => <Radio key={entry} value={entry}>{entry}</Radio>)}
                            </Radio.Group>}
                    </div>
                    <Radio.Group key="attribute" value={attribute} onChange={onAttributeChange}>
                        {familyAttributeList.map(entry => <Radio key={entry} value={entry}>{entry}</Radio>)}
                    </Radio.Group>
                </div>
                <hr />
                <div key="pic" className="main-info">
                    <div className="main-info-first">
                        <Input key="set-id" />
                        {isMonster && <>
                            <Input key="pendulum-scale" addonBefore="Pendulum Scale" value={pendulum_scale} onChange={onScaleChange} />
                            <TextArea key="pendulum-effect" />
                            <Select
                                allowClear
                                className="hide-selected"
                                mode="tags"
                                onChange={onTypeAbilityChange}
                                placeholder="Type / Ability"
                                style={{ width: '100%' }}
                                value={type_ability}
                            >
                                {(sequentialTypeAbility[type_ability.length] ?? defaultTypeAbilityList)
                                    .filter(entry => !type_ability.includes(entry))
                                    .map(entry => <Option key={entry} value={entry}>{entry}</Option>)}
                            </Select>
                        </>}
                        <div>
                            <TextArea key="effect"
                                placeholder="Card effect"
                                value={effect}
                                onChange={onEffectChange}
                                rows={6}
                            />
                        </div>
                        <Row>
                            <Col span={4}>
                                <Input key="atk" addonBefore="ATK" value={atk} onChange={onATKChange} />
                            </Col>
                            <Col span={4}>
                                <Input key="def" addonBefore="DEF" value={def} onChange={onDEFChange} />
                            </Col>
                            {/* <Col span={4}>
                        <InputNumber key="link-number" value={link_count} />
                    </Col> */}
                        </Row>
                        <Input key="passcode" />
                    </div>
                    <div className="main-info-second">
                        <ImageCropper
                            noRedrawNumber={scaleRatio}
                            defaultExternalSource={picture}
                            onSourceChange={onPictureChange}
                            previewCanvasRef={previewCanvasRef.current}
                        >
                            {isMonster
                                ? <LinkMarkChooser defaultValue={link_map} onChange={onLinkMapChange} />
                                : <div />}
                        </ImageCropper>
                    </div>
                </div>
            </div>
            <div className="card-preview-panel">
                <div className="control-board">
                    <div className="control-zoom">
                        <Slider
                            min={1}
                            max={100}
                            defaultValue={defaultZoomScaleRatio}
                            onChange={onZoomChange}
                        />
                        <span>{Math.round(zoomValue.scaleRatio * 100)}%</span>
                        <Button type="primary" onClick={() => prepareForExport()}>Save As Image</Button>
                    </div>
                </div>
                <div id="card-capture-container" className="card-preview">
                    <div className="preview preview-name">
                        <TextBoxTitle name="name" zoom={scaleRatio} value={name} font={{
                            fontSize: 64.59,
                            lineHeight: 46.45,
                        }} />
                    </div>
                    <div className="preview preview-attribute">
                        <AttributeIcon type={attribute} />
                    </div>
                    {isPendulum && <>
                        <div className={`preview-scale-number left-scale size-${pendulumSize}`}>{pendulum_scale}</div>
                        <div className={`preview-scale-number right-scale size-${pendulumSize}`}>{pendulum_scale}</div>
                    </>}
                    {family === 'Monster'
                        ? <div className={`preview preview-star ${star > 12 ? 'preview-star-oversize' : ''}`}>
                            {!isLink && <Star count={star} type={isXyz ? 'rank' : 'level'} />}
                        </div>
                        : <div className="preview preview-st-sub-family">
                            <STSubFamily family={family} subFamily={subFamily} />
                        </div>}
                    {isLink && <div className="preview preview-link-marker">
                        <LinkMarker arrow={link_map} />
                    </div>}
                    {isMonster
                        ? <TextBox key="monster" className={`preview-effect preview-effect-${effectSize}`} zoom={scaleRatio}
                            isFlavorText={isNormal}
                            value={effect}
                            typeAbilityValue={type_ability}
                            name={'monster-effect'}
                            type={'monster'}
                            fontList={defaultMonsterFontList}
                            sizeList={defaultMonsterSizeList} />
                        : <TextBox key="s/t" className={`preview-effect preview-effect-${effectSize}`} zoom={scaleRatio}
                            value={effect}
                            typeAbilityValue={type_ability}
                            name={'st-effect'}
                            type={'st'}
                            fontList={defaultSTFontList}
                            sizeList={defaultSTSizeList} />}
                    {isMonster && <div className="preview preview-atk">
                        <TextBoxTitle name="atk" zoom={scaleRatio} value={atk} alignment="right" font={{
                            fontSize: 24.61,
                            lineHeight: 29.532,
                        }} />
                    </div>}
                    {isMonster && (
                        !isLink
                            ? <div className="preview preview-def">
                                <TextBoxTitle name="def" zoom={scaleRatio} value={def} alignment="right" font={{
                                    fontSize: 24.61,
                                    lineHeight: 29.532,
                                }} />
                            </div>
                            : <div className="preview preview-link">
                                {link_map.length > 0 && <img src={`./asset/image/link-number/link-corner-${link_map.length}.png`} alt="link number" />}
                            </div>
                    )}
                    <div className="preview preview-frame">
                        <CardFrame family={family} subFamily={subFamily} typeAbility={type_ability}>
                            <div className={`preview preview-picture ${isPendulum ? 'picture-pendulum' : ''}`}>
                                <div className="canvas-container">
                                    <canvas className="crop-canvas" ref={previewCanvasRef} />
                                </div>
                            </div>
                        </CardFrame>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
