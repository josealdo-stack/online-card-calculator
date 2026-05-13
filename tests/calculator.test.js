const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateEffectiveCost,
  extractExchangeRate,
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

test('a interface usa spread manual em vez de ranking online antigo', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /melhorescartoes\.com\.br/i);
  assert.doesNotMatch(html, /bankPreset/);
  assert.match(html, /Digite o spread do seu cartão manualmente/i);
});

test('a interface mostra fontes de referência e disclaimer para spread', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /Confira seu emissor antes de confiar no spread/i);
  assert.match(html, /O spread pode mudar por cartão, faixa de cliente e campanha/i);
  assert.match(html, /class="source-chip"/i);
  assert.match(html, /https:\/\/nubank\.com\.br\/contratos\/termos-condicoes-cartao-credito-nubank/i);
  assert.match(html, /https:\/\/www\.c6bank\.com\.br\/cartao-de-credito\//i);
  assert.match(html, /https:\/\/inter\.co\/pra-voce\/cartoes\//i);
  assert.match(html, /https:\/\/www\.itau\.com\.br\/cartoes/i);
  assert.match(html, /https:\/\/www\.santander\.com\.br\/cartoes/i);
  assert.match(html, /https:\/\/banco\.bradesco\/html\/classic\/produtos-servicos\/cartoes\/credito\.shtm/i);
  assert.match(html, /https:\/\/banking\.btgpactual\.com\/cartao-de-credito/i);
});

test('a interface usa 3.50% como IOF padrão', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /id="iofPct"[\s\S]*value="3\.50"/);
});
