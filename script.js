// ═══════════════════════════════════════════════════
//  ANTI-INSPECT / PROTEÇÃO — MÁXIMA
// ═══════════════════════════════════════════════════

const BLOCKED_MSG = `
  <div style="
    position:fixed;inset:0;background:#080a0f;
    display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:16px;font-family:Inter,sans-serif;
  ">
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
         stroke="#8b5cf6" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94
               a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    </svg>
    <p style="color:#f1f1f3;font-size:1.1rem;font-weight:700;letter-spacing:-0.3px;">Acesso negado</p>
    <p style="color:#8b8d99;font-size:0.83rem;text-align:center;max-width:280px;line-height:1.6;">
      Feche as ferramentas do desenvolvedor e recarregue a página.
    </p>
  </div>`;

// 1. Desabilitar clique direito
document.addEventListener('contextmenu', e => e.preventDefault());

// 2. Desabilitar seleção de texto
document.addEventListener('selectstart', e => e.preventDefault());

// 3. Bloquear atalhos de teclado
document.addEventListener('keydown', e => {
  const blocked = [
    e.key === 'F12',
    e.ctrlKey  && e.key.toLowerCase() === 'u',
    e.ctrlKey  && e.key.toLowerCase() === 's',
    e.ctrlKey  && e.key.toLowerCase() === 'a',
    e.ctrlKey  && e.shiftKey && ['i','j','c','k'].includes(e.key.toLowerCase()),
    e.metaKey  && e.key.toLowerCase() === 'u',
    e.metaKey  && e.altKey  && ['i','j','c'].includes(e.key.toLowerCase()),
  ];
  if (blocked.some(Boolean)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, true);

// 4. Detectar DevTools pelo tamanho da janela
(function devtoolsGuard() {
  const THRESHOLD = 160;
  let blocked = false;

  function check() {
    const wDiff = window.outerWidth  - window.innerWidth;
    const hDiff = window.outerHeight - window.innerHeight;
    const open  = wDiff > THRESHOLD || hDiff > THRESHOLD;

    if (open && !blocked) {
      blocked = true;
      document.body.innerHTML = BLOCKED_MSG;
    }
  }
  setInterval(check, 600);
})();

// 5. Trap de debugger — trava as DevTools quando abertas
(function debuggerTrap() {
  function trap() {
    (function() {
      const start = new Date();
      debugger;
      const end = new Date();
      if (end - start > 100) {
        document.body.innerHTML = BLOCKED_MSG;
      }
    })();
  }
  setInterval(trap, 1500);
})();

// 6. Limpar console continuamente
(function clearConsole() {
  setInterval(() => {
    try { console.clear(); } catch(_) {}
  }, 500);
})();

// 7. Sobrescrever métodos do console (não mostra erros/logs)
(function lockConsole() {
  const noop = () => {};
  ['log','warn','error','info','debug','table','dir'].forEach(m => {
    try { console[m] = noop; } catch(_) {}
  });
})();

// ═══════════════════════════════════════════════════
//  GATE — LOGIN COM DISCORD + CLOUDFLARE TURNSTILE
// ═══════════════════════════════════════════════════

// Variável global para controle do Turnstile
let turnstileVerified = false;

// Callbacks do Cloudflare Turnstile
function onTurnstileSuccess(token) {
  turnstileVerified = true;
  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.classList.add('ready');
  }
}

function onTurnstileExpired() {
  turnstileVerified = false;
  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.classList.remove('ready');
  }
}

function onTurnstileError() {
  turnstileVerified = false;
  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.classList.remove('ready');
  }
  alert('Erro na verificação de segurança. Tente novamente.');
}

document.addEventListener('DOMContentLoaded', () => {

  const gateOverlay = document.getElementById('gateOverlay');
  const siteContent = document.getElementById('siteContent');
  const confirmBtn  = document.getElementById('confirmBtn');

  let discordClicked = false;

  // Se já passou na sessão atual, abre direto
  if (localStorage.getItem('wl_auth') === '1') {
    openSite(false);
    return;
  }

  // Clique no botão Discord
  window.onDiscordClick = function () {
    discordClicked = true;

    // Mostra a seção de confirmação com o Turnstile
    const gateConfirm = document.getElementById('gateConfirm');
    if (gateConfirm) {
      gateConfirm.style.display = 'block';
    }

    // Recarrega o widget do Turnstile se necessário
    if (typeof turnstile !== 'undefined') {
      setTimeout(() => {
        turnstile.reset();
      }, 100);
    }
  };

  // Confirmar acesso após autorizar no Discord E verificar Turnstile
  window.confirmAccess = function () {
    if (!discordClicked) {
      alert('Por favor, clique primeiro no botão do Discord para autorizar.');
      return;
    }

    if (!turnstileVerified) {
      alert('Por favor, complete a verificação de segurança do Cloudflare primeiro.');
      return;
    }

    // Verifica se o token do Turnstile ainda é válido
    if (typeof turnstile !== 'undefined') {
      const token = turnstile.getResponse();
      if (!token) {
        alert('Verificação de segurança expirada. Por favor, complete novamente.');
        return;
      }
      
      // Aqui você pode enviar o token para seu servidor para validação adicional
      // Exemplo: enviar token via fetch para seu backend
      /*
      fetch('/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      }).then(response => response.json())
        .then(data => {
          if (data.success) {
            localStorage.setItem('wl_auth', '1');
            openSite(true);
          }
        });
      */
    }

    localStorage.setItem('wl_auth', '1');
    openSite(true);
  };

  function openSite(animate) {
    if (animate) {
      gateOverlay.classList.add('fade-out');
      setTimeout(() => { gateOverlay.style.display = 'none'; }, 560);
    } else {
      gateOverlay.style.display = 'none';
    }
    siteContent.classList.add('unlocked');
    initSite();
  }

  // ─── Partículas decorativas ──────────────────────
  const container = document.getElementById('gateParticles');
  if (container) {
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      const size = Math.random() * 4 + 2;
      p.style.cssText = `
        width:${size}px;height:${size}px;
        left:${Math.random() * 100}%;
        animation-duration:${Math.random() * 8 + 6}s;
        animation-delay:${Math.random() * 6}s;
        opacity:0;
      `;
      container.appendChild(p);
    }
  }
});

// ═══════════════════════════════════════════════════
//  SITE — lógica dos cards e pesquisa
// ═══════════════════════════════════════════════════

function initSite() {
  const searchInput = document.getElementById('searchInput');
  const cardsGrid   = document.getElementById('cardsGrid');
  const noResults   = document.getElementById('noResults');
  if (!cardsGrid) return;

  const cards = Array.from(cardsGrid.querySelectorAll('.card'));

  // Toggle expand / collapse
  window.toggleCard = function (header) {
    const card       = header.closest('.card');
    const isExpanded = card.classList.contains('expanded');
    cards.forEach(c => { if (c !== card) c.classList.remove('expanded'); });
    card.classList.toggle('expanded', !isExpanded);
  };

  // Pesquisa / filtro
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    let visible = 0;

    cards.forEach(card => {
      const name  = card.dataset.name || '';
      const desc  = card.querySelector('.card-desc')?.textContent.toLowerCase() || '';
      const match = !q || name.includes(q) || desc.includes(q);

      card.classList.toggle('hidden', !match);
      if (!match) card.classList.remove('expanded');
      if (match)  visible++;
    });

    noResults.classList.toggle('visible', visible === 0 && q.length > 0);
  });

  // Impede que clique no Download toggle o card
  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', e => e.stopPropagation());
  });

  // Paralaxe suave no brilho de fundo
  const bgGlow = document.querySelector('.bg-glow');
  document.addEventListener('mousemove', e => {
    if (!bgGlow) return;
    const x = (e.clientX / window.innerWidth  - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    bgGlow.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px)`;
  });
}
