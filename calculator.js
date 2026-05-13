function toNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} precisa ser um número válido.`);
  }

  if (number < 0) {
    throw new Error(`${fieldName} não pode ser negativo.`);
  }

  return number;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function extractExchangeRate(payload) {
  const bid = Number(payload?.USDBRL?.bid);

  if (!Number.isFinite(bid) || bid <= 0) {
    throw new Error('A resposta da API não trouxe uma cotação válida.');
  }

  return {
    rate: bid,
    source: 'AwesomeAPI',
    updatedAt: payload?.USDBRL?.create_date || null,
  };
}

function calculateEffectiveCost(input) {
  const itemUsd = toNumber(input.itemUsd, 'Valor do produto');
  const shippingUsd = toNumber(input.shippingUsd, 'Frete');
  const exchangeRate = toNumber(input.exchangeRate, 'Cotação do dólar');
  const spreadPct = toNumber(input.spreadPct, 'Spread do cartão');
  const iofPct = toNumber(input.iofPct, 'IOF');
  const fixedFeeBrl = toNumber(input.fixedFeeBrl, 'Taxa fixa');

  const totalUsd = roundCurrency(itemUsd + shippingUsd);
  const baseBrl = roundCurrency(totalUsd * exchangeRate);
  const spreadBrl = roundCurrency(baseBrl * (spreadPct / 100));
  const subtotalBeforeIof = roundCurrency(baseBrl + spreadBrl);
  const iofBrl = roundCurrency(subtotalBeforeIof * (iofPct / 100));
  const totalBrl = roundCurrency(subtotalBeforeIof + iofBrl + fixedFeeBrl);
  const effectiveRate = totalUsd === 0 ? 0 : roundCurrency(totalBrl / totalUsd);

  return {
    totalUsd,
    baseBrl,
    spreadBrl,
    subtotalBeforeIof,
    iofBrl,
    fixedFeeBrl: roundCurrency(fixedFeeBrl),
    totalBrl,
    effectiveRate,
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calculateEffectiveCost,
    extractExchangeRate,
    roundCurrency,
  };
}

if (typeof window !== 'undefined') {
  window.calculateEffectiveCost = calculateEffectiveCost;
  window.extractExchangeRate = extractExchangeRate;
}
