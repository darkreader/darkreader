import { html } from 'malevic';
import { Row, Col, CheckBox, UpDown, Select } from '../controls';
import { Extension } from '../../background/extension';

export default function FontSettings({ ext }: { ext: Extension }) {
    return (
        <Col>
            <Col class="control-container">
                <Row class="control-container__line font-select-container">
                    <CheckBox
                        checked={ext.config.useFont}
                        onchange={(e) => ext.setConfig({ useFont: e.target.checked })}
                    />
                    <Select
                        value={ext.config.fontFamily}
                        onChange={(value) => ext.setConfig({ fontFamily: value })}
                        options={ext.fonts.reduce((map, font) => {
                            map[font] = (
                                <div style={{ 'font-family': font }}>
                                    {font}
                                </div>
                            );
                            return map;
                        }, {} as { [font: string]: Malevic.NodeDeclaration; })}
                    />
                </Row>
                <label class="control-container__description">
                    Select a font
                </label>
            </Col>
            <UpDown
                value={ext.config.textStroke}
                min={0}
                max={1}
                step={0.1}
                default={0}
                name="Text stroke"
                onChange={(value) => ext.setConfig({ textStroke: value })}
            />
        </Col>
    );
}
