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

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function normalizeBankName(name) {
  return String(name)
    .replace(/\s*\(\*\)\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePercentNumber(rawValue) {
  return Number(String(rawValue).replace('%', '').replace(',', '.'));
}

function parseSpreadRanking(markdown) {
  const text = String(markdown || '');
  const matches = [...text.matchAll(/💳\s*(.+?)\s*(\d+,\d+%)\s*(\d+,\d+%)\s*(\d+,\d+%)\s*(Não|Sim|Cashback(?:\(\*\))?)/g)];

  const ranking = matches.map((match) => {
    const name = normalizeBankName(match[1]);

    return {
      id: slugify(name),
      name,
      iofPct: parsePercentNumber(match[2]),
      spreadPct: parsePercentNumber(match[3]),
      totalPct: parsePercentNumber(match[4]),
      points: match[5],
      sourceType: 'Cartão de crédito',
    };
  });

  if (ranking.length === 0) {
    throw new Error('A fonte online não trouxe cartões válidos para o ranking.');
  }

  return ranking;
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
    normalizeBankName,
    parseSpreadRanking,
    roundCurrency,
  };
}

if (typeof window !== 'undefined') {
  window.calculateEffectiveCost = calculateEffectiveCost;
  window.extractExchangeRate = extractExchangeRate;
  window.normalizeBankName = normalizeBankName;
  window.parseSpreadRanking = parseSpreadRanking;
}
