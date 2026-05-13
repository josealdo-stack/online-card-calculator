const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateEffectiveCost,
  extractExchangeRate,
  parseSpreadRanking,
  normalizeBankName,
} = require('../calculator.js');

test('calcula custo efetivo com spread e IOF', () => {
  const result = calculateEffectiveCost({
    itemUsd: 100,
    shippingUsd: 20,
    exchangeRate: 5,
    spreadPct: 4,
    iofPct: 3.38,
    fixedFeeBrl: 0,
  });

  assert.deepEqual(result, {
    totalUsd: 120,
    baseBrl: 600,
    spreadBrl: 24,
    subtotalBeforeIof: 624,
    iofBrl: 21.09,
    fixedFeeBrl: 0,
    totalBrl: 645.09,
    effectiveRate: 5.38,
  });
});

test('inclui taxa fixa em reais', () => {
  const result = calculateEffectiveCost({
    itemUsd: 50,
    shippingUsd: 10,
    exchangeRate: 5.5,
    spreadPct: 3,
    iofPct: 4,
    fixedFeeBrl: 12,
  });

  assert.equal(result.totalBrl, 365.5);
  assert.equal(result.effectiveRate, 6.09);
});

test('rejeita valores negativos', () => {
  assert.throws(() => calculateEffectiveCost({
    itemUsd: -1,
    shippingUsd: 0,
    exchangeRate: 5,
    spreadPct: 0,
    iofPct: 0,
    fixedFeeBrl: 0,
  }), /não pode ser negativo/i);
});

test('extrai a cotação bid da AwesomeAPI', () => {
  const rate = extractExchangeRate({
    USDBRL: {
      bid: '4.9291',
      create_date: '2026-05-13 11:48:28',
    },
  });

  assert.deepEqual(rate, {
    rate: 4.9291,
    source: 'AwesomeAPI',
    updatedAt: '2026-05-13 11:48:28',
  });
});

test('falha se a resposta da API não tiver cotação válida', () => {
  assert.throws(() => extractExchangeRate({ USDBRL: {} }), /cotação válida/i);
});

test('normaliza nome do banco removendo observações visuais', () => {
  assert.equal(normalizeBankName('Caixa – Cartões Visa (*)'), 'Caixa – Cartões Visa');
});

test('extrai cartões de crédito do ranking online de spread', () => {
  const ranking = parseSpreadRanking(`
## **Ranking de spread no Brasil**
💱 = Conta Global
💳 = Cartão de crédito
**BANCO****IOF****SPREAD****TOTAL****PONTUA?**
💱Wise 3,50%0,80%4,30%Não
💳Nubank 3,50%4,00%7,50%Não
💳C6 Bank 3,50%5,25%8,75%Sim
💳Caixa – Cartões Visa (*)0,00%4,00%4,00%Sim
`);

  assert.deepEqual(ranking, [
    {
      id: 'nubank',
      name: 'Nubank',
      iofPct: 3.5,
      spreadPct: 4,
      totalPct: 7.5,
      points: 'Não',
      sourceType: 'Cartão de crédito',
    },
    {
      id: 'c6-bank',
      name: 'C6 Bank',
      iofPct: 3.5,
      spreadPct: 5.25,
      totalPct: 8.75,
      points: 'Sim',
      sourceType: 'Cartão de crédito',
    },
    {
      id: 'caixa-cartoes-visa',
      name: 'Caixa – Cartões Visa',
      iofPct: 0,
      spreadPct: 4,
      totalPct: 4,
      points: 'Sim',
      sourceType: 'Cartão de crédito',
    },
  ]);
});

test('falha quando o ranking online não traz cartões válidos', () => {
  assert.throws(() => parseSpreadRanking('💱Wise 3,50%0,80%4,30%Não'), /cartões válidos/i);
});
