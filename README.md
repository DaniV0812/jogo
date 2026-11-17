# 🚀 Defensor do Espaço

Space shooter vertical feito em **HTML5 Canvas + JavaScript puro** (ES Modules), sem engines e sem assets externos. Todos os gráficos são desenhados no canvas e os sons são sintetizados com WebAudio.

## Como rodar

**Windows — sem instalar nada:** dê dois cliques em `start.bat`. Ele sobe um servidor local em PowerShell puro e abre o navegador em `http://localhost:8000`. Deixe a janela do console aberta enquanto joga (feche-a ou aperte `Ctrl+C` para encerrar).

Se a porta 8000 estiver ocupada:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File start.ps1 -Port 8080
```

**Outros sistemas:** o jogo usa ES Modules, então precisa de um servidor HTTP (abrir o `index.html` direto não funciona). Qualquer um serve:

```bash
npx serve .
# ou
py -m http.server 8000
```

No VS Code também funciona com a extensão **Live Server**.

## Controles

| Ação | Teclas |
| --- | --- |
| Mover | `WASD` / setas |
| Atirar | `Espaço` (segure) |
| Mover + atirar (mouse/touch) | clique/arraste na tela |
| Pausar | `P` / `Esc` |
| Som liga/desliga | `M` |

## Como funciona o jogo

- **Ondas infinitas**: a dificuldade aumenta a cada onda (mais inimigos, spawn mais rápido).
- **Chefe a cada 5 ondas**: o **DESTRUIDOR** tem barra de vida e 3 padrões de ataque. O núcleo brilhante é o ponto fraco: leva **dano em dobro**.
- **Inimigos**: drone (zigue-zague), kamikaze (persegue), atirador (para e mira) e tanque (lento, resistente, tiro em leque).
- **Power-ups**: `R` tiro rápido, `D` tiro duplo, `S` escudo (absorve 1 hit), `+` vida extra. Tanques dropam sempre; os outros têm 12% de chance.
- **Recorde** salvo no `localStorage`.

## Estrutura

```
index.html
css/style.css
js/
  main.js              # bootstrap + game loop + resize
  game.js              # estados, ondas, colisões, HUD e telas
  input.js             # teclado, mouse e touch
  audio.js             # efeitos sintetizados (WebAudio)
  particles.js         # sistema de partículas
  utils.js             # constantes, math e colisão
  entities/
    player.js          # nave do jogador
    enemy.js           # todos os inimigos + chefe
    bullet.js          # projéteis
    powerup.js         # cápsulas de upgrade
start.bat              # atalho: abre o servidor local
start.ps1              # servidor HTTP em PowerShell (sem dependências)
```

## Onde ajustar a dificuldade

| O quê | Onde |
| --- | --- |
| Quantidade e ritmo dos inimigos | `startWave()` e `rollEnemyType()` em `js/game.js` |
| Vida, velocidade e dano dos inimigos | `CFG` no topo de `js/entities/enemy.js` |
| Cadência e alcance do tiro do jogador | `tryShoot()` em `js/entities/player.js` |
| Chance de drop dos power-ups | `die()` em `js/entities/enemy.js` e `dropPowerUp()` em `js/game.js` |
| Vida do chefe | `CFG.boss.hp` + bônus por onda no construtor de `Enemy` |

## Próximos passos sugeridos

1. **Sprites**: trocar os polígonos por spritesheets (kenney.nl tem packs gratuitos).
2. **Música de fundo**: sequenciador simples com WebAudio ou um `.ogg` em loop.
3. **Novos chefes**: criar variações no `bossAttack()` (laser telegrafado, minas, escudo rotativo).
4. **Combos**: multiplicador de pontos ao matar vários inimigos sem levar dano.
5. **Leaderboard**: trocar o `localStorage` por uma API (ex.: Supabase) para ranking online.
6. **Gamepad**: API `navigator.getGamepads()` para controle.
7. **Mobile**: joystick virtual em vez de seguir o dedo.

## Créditos

Feito para rodar 100% no navegador, sem dependências. Sinta-se livre para adaptar o nome, as cores e as ondas.
