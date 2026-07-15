import test from 'node:test'
import assert from 'node:assert/strict'
import { appendThermalStorageCaption, getThermalStorageError } from '../src/utils/thermalStorage.js'

test('exige temperatura máxima quando o item é termolábil', () => {
    assert.equal(
        getThermalStorageError({ termolabil: true, temperaturaMaximaC: '' }),
        'Item: informe a temperatura máxima de conservação em °C.'
    )
})

test('aceita temperatura máxima válida para item termolábil', () => {
    assert.equal(getThermalStorageError({ termolabil: true, temperaturaMaximaC: '8' }), null)
})

test('não exige temperatura para item não termolábil', () => {
    assert.equal(getThermalStorageError({ termolabil: false, temperaturaMaximaC: '' }), null)
})

test('inclui alerta termolábil na legenda do WhatsApp', () => {
    const lines = appendThermalStorageCaption(['Medicamento disponível'], {
        termolabil: true,
        temperaturaMaximaC: '8'
    })

    assert.deepEqual(lines, [
        'Medicamento disponível',
        '❄️ TERMOLÁBIL: manter até 8 °C'
    ])
})