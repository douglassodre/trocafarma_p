export function getThermalStorageError(item, label = 'Item') {
    if (!item?.termolabil) return null

    const temperature = Number(item.temperaturaMaximaC)
    if (!Number.isFinite(temperature)) {
        return label + ': informe a temperatura máxima de conservação em °C.'
    }

    if (temperature < -100 || temperature > 100) {
        return label + ': informe uma temperatura entre -100 °C e 100 °C.'
    }

    return null
}

export function appendThermalStorageCaption(lines, formData) {
    if (formData?.termolabil) {
        lines.push('❄️ TERMOLÁBIL: manter até ' + formData.temperaturaMaximaC + ' °C')
    }

    return lines
}