import { html } from 'malevic';
import { Row, Col, Button, Toggle, UpDown } from '../controls';
import { Extension } from '../../background/extension';

export default function FilterSettings({ ext }: { ext: Extension }) {

    const mode = (
        <Col id="modeToggle" class="control">
            <Row class="control__line">
                <Button
                    class={{ 'button--active': ext.config.mode === 1 }}
                    onclick={() => ext.setConfig({ mode: 1 })}
                >
                    <span class="icon-dark-mode"></span>
                </Button>
                <Toggle
                    checked={ext.config.mode === 1}
                    labelOn="Dark"
                    labelOff="Light"
                />
                <Button
                    class={{ 'button--active': ext.config.mode === 0 }}
                    onclick={() => ext.setConfig({ mode: 0 })}
                >
                    <span class="icon-light-mode"></span>
                </Button>
            </Row>
        </Col>
    );

    const brightness = (
        <UpDown
            value={ext.config.brightness}
            min={50}
            max={150}
            step={10}
            default={100}
            name="Brightness"
            onChange={(value) => ext.setConfig({ brightness: value })}
        />
    );

    const contrast = (
        <UpDown
            value={ext.config.contrast}
            min={50}
            max={150}
            step={10}
            default={100}
            name="Contrast"
            onChange={(value) => ext.setConfig({ contrast: value })}
        />
    );

    const grayscale = (
        <UpDown
            value={ext.config.grayscale}
            min={0}
            max={100}
            step={10}
            default={0}
            name="Grayscale"
            onChange={(value) => ext.setConfig({ grayscale: value })}
        />
    );

    const sepia = (
        <UpDown
            value={ext.config.sepia}
            min={0}
            max={100}
            step={10}
            default={0}
            name="Sepia"
            onChange={(value) => ext.setConfig({ sepia: value })}
        />
    );

    return (
        <Col>
            {mode}
            {brightness}
            {contrast}
            {grayscale}
            {sepia}
        </Col>
    );
}
