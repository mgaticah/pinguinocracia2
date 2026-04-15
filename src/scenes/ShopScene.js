import Phaser from 'phaser'
import EventBus from '../EventBus.js'

const SHOP_ITEMS = [
  { key: 'manzana', label: 'Manzana', desc: '+2 HP', emoji: '🍎', cost: 10 },
  { key: 'maruchan', label: 'Maruchan', desc: '+5 HP', emoji: '🍜', cost: 20 },
  { key: 'energetica', label: 'Energética', desc: 'Velocidad ×1.5', emoji: '⚡', cost: 10 },
  { key: 'botellita', label: 'Molotov', desc: '+1 molotov', emoji: '🔥', cost: 5 }
]

/**
 * ShopScene — Store between levels.
 * Left panel: team status (player + allies, selectable).
 * Right panel: shop items to buy for the selected character.
 */
export default class ShopScene extends Phaser.Scene {
  constructor () {
    super('ShopScene')
  }

  create () {
    const { width, height } = this.cameras.main
    const data = this.scene.settings.data || {}
    this._targetMap = data.targetMap || ''
    this._credits = data.credits || 0
    this._purchases = []
    this._selectedIndex = 0 // 0 = player, 1+ = allies

    // Gather team data from GameScene
    const gameScene = this.scene.get('GameScene')
    this._team = this._buildTeamData(gameScene)

    // Background
    if (this.textures?.exists('tiendanivel')) {
      this.add.image(width / 2, height / 2, 'tiendanivel').setDisplaySize(width, height)
    } else {
      const gfx = this.add.graphics()
      gfx.fillStyle(0x1a1a2e, 1)
      gfx.fillRect(0, 0, width, height)
    }

    // Credits bar at top center
    const topBar = this.add.graphics()
    topBar.fillStyle(0x000000, 0.7)
    topBar.fillRoundedRect(width / 2 - 170, 8, 340, 46, 12)
    this._creditsText = this.add.text(width / 2, 31, `💰 ${this._credits} créditos`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffdd44',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5)

    // Left panel: team
    this._drawTeamPanel(width, height)

    // Right panel: shop items
    this._drawShopPanel(width, height)

    // Continue button at bottom
    this._drawContinueButton(width, height)
  }

  _buildTeamData (gameScene) {
    const team = []

    // Player
    const p = gameScene?.player
    team.push({
      label: '🐧 Jugador',
      hp: p?.hp ?? 10,
      maxHp: p?.maxHp ?? 10,
      weapon: p?.weapon || 'piedra',
      molotovs: gameScene?.globalCounter?.molotovs || 0,
      ref: p,
      isPlayer: true
    })

    // Allies
    if (gameScene?.allyGroup?.getChildren) {
      for (const ally of gameScene.allyGroup.getChildren()) {
        if (!ally.active || ally.isDead) continue
        team.push({
          label: `🐧 ${ally.type || 'aliado'}`,
          hp: ally.hp ?? 0,
          maxHp: ally.maxHp ?? 10,
          weapon: 'piedra',
          molotovs: 0,
          ref: ally,
          isPlayer: false
        })
      }
    }

    return team
  }

  _drawTeamPanel (w, h) {
    const panelX = 30
    const panelW = w * 0.32
    const panelY = 70
    const panelH = h * 0.7

    // Panel background
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.65)
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 10)

    this.add.text(panelX + panelW / 2, panelY + 20, 'EQUIPO', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5)

    this._teamCards = []
    const cardH = 64
    const startY = panelY + 50
    const spacing = 72

    this._team.forEach((member, i) => {
      const cy = startY + i * spacing
      const card = this._createTeamCard(panelX + 10, cy, panelW - 20, cardH, member, i)
      this._teamCards.push(card)
    })

    // Select first by default
    this._updateSelection()
  }

  _createTeamCard (x, y, w, h, member, index) {
    const cardBg = this.add.graphics()
    const isSelected = index === this._selectedIndex

    // Name
    const nameText = this.add.text(x + 12, y + 10, member.label, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    })

    // HP bar
    const hpBarX = x + 12
    const hpBarY = y + 36
    const hpBarW = w - 24
    const hpBarH = 10
    const hpGfx = this.add.graphics()
    this._drawHpBar(hpGfx, hpBarX, hpBarY, hpBarW, hpBarH, member.hp, member.maxHp)

    // HP text
    const hpText = this.add.text(x + w - 12, y + 10, `${member.hp}/${member.maxHp} HP`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
      stroke: '#000000', strokeThickness: 1
    }).setOrigin(1, 0)

    // Weapon info (player only)
    let weaponText = null
    if (member.isPlayer) {
      weaponText = this.add.text(x + w - 12, y + 48, `🪨 piedra  🔥 ×${member.molotovs}`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#cccccc'
      }).setOrigin(1, 0)
    }

    // Interactive zone for selection
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
      .setInteractive({ useHandCursor: true })

    zone.on('pointerdown', () => {
      this._selectedIndex = index
      this._updateSelection()
    })

    return { cardBg, nameText, hpGfx, hpText, weaponText, zone, x, y, w, h, index, member }
  }

  _updateSelection () {
    for (const card of this._teamCards) {
      const selected = card.index === this._selectedIndex
      card.cardBg.clear()
      if (selected) {
        card.cardBg.fillStyle(0x2244aa, 0.7)
        card.cardBg.lineStyle(2, 0xffdd44, 0.9)
      } else {
        card.cardBg.fillStyle(0x000000, 0.4)
        card.cardBg.lineStyle(1, 0xffffff, 0.3)
      }
      card.cardBg.fillRoundedRect(card.x, card.y, card.w, card.h, 6)
      card.cardBg.strokeRoundedRect(card.x, card.y, card.w, card.h, 6)
      card.nameText.setColor(selected ? '#ffdd44' : '#ffffff')
    }
  }

  _drawHpBar (gfx, x, y, w, h, hp, maxHp) {
    gfx.clear()
    // Background
    gfx.fillStyle(0x333333, 0.8)
    gfx.fillRect(x, y, w, h)
    // Fill
    const ratio = Math.max(0, hp / maxHp)
    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444
    gfx.fillStyle(color, 1)
    gfx.fillRect(x, y, w * ratio, h)
    // Border
    gfx.lineStyle(1, 0xffffff, 0.4)
    gfx.strokeRect(x, y, w, h)
  }

  _drawShopPanel (w, h) {
    const panelX = w * 0.36
    const panelW = w * 0.6
    const panelY = 70
    const panelH = h * 0.7

    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.65)
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 10)

    this.add.text(panelX + panelW / 2, panelY + 20, 'TIENDA', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5)

    const cardW = panelW - 40
    const cardH = 56
    const startY = panelY + 55
    const spacing = 68

    SHOP_ITEMS.forEach((item, i) => {
      const cx = panelX + panelW / 2
      const cy = startY + i * spacing
      this._createShopCard(cx, cy, cardW, cardH, item)
    })
  }

  _createShopCard (cx, cy, w, h, item) {
    const cardBg = this.add.graphics()
    cardBg.fillStyle(0x000000, 0.5)
    cardBg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 6)
    cardBg.lineStyle(1, 0xffffff, 0.2)
    cardBg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 6)

    // Emoji + name
    this.add.text(cx - w / 2 + 14, cy, `${item.emoji} ${item.label}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0, 0.5)

    // Description
    this.add.text(cx, cy, item.desc, {
      fontFamily: 'monospace', fontSize: '16px', color: '#cccccc'
    }).setOrigin(0.5)

    // Cost
    this.add.text(cx + w / 2 - 190, cy, `${item.cost} cr`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffdd44',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0, 0.5)

    // Buy button
    const buyX = cx + w / 2 - 55
    const buyBg = this.add.graphics()
    this._drawBtn(buyBg, buyX - 42, cy - 16, 84, 32, false)

    const buyText = this.add.text(buyX, cy, 'Comprar', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5)

    const buyZone = this.add.zone(buyX, cy, 84, 32)
      .setInteractive({ useHandCursor: true })

    buyZone.on('pointerover', () => {
      buyBg.clear(); this._drawBtn(buyBg, buyX - 42, cy - 16, 84, 32, true)
      buyText.setColor('#ffdd44')
    })
    buyZone.on('pointerout', () => {
      buyBg.clear(); this._drawBtn(buyBg, buyX - 42, cy - 16, 84, 32, false)
      buyText.setColor('#ffffff')
    })
    buyZone.on('pointerdown', () => {
      if (this._credits >= item.cost) {
        this._credits -= item.cost
        this._purchases.push({ key: item.key, targetIndex: this._selectedIndex })
        this._creditsText.setText(`💰 ${this._credits} créditos`)
        this._applyImmediately(item.key, this._selectedIndex)
        this._showFeedback(buyX, cy - 28, '✓', '#66ff66')
      } else {
        this._showFeedback(buyX, cy - 28, 'Sin créditos', '#ff6666')
      }
    })
  }

  _drawContinueButton (w, h) {
    const btnY = h * 0.88
    const btnW = 440
    const btnH = 48

    const btnBg = this.add.graphics()
    this._drawBtn(btnBg, w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, false)

    const btnText = this.add.text(w / 2, btnY, 'Continuar al siguiente nivel ▶', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5)

    const hitZone = this.add.zone(w / 2, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true })

    hitZone.on('pointerover', () => {
      btnBg.clear(); this._drawBtn(btnBg, w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, true)
      btnText.setColor('#66ff66')
    })
    hitZone.on('pointerout', () => {
      btnBg.clear(); this._drawBtn(btnBg, w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, false)
      btnText.setColor('#ffffff')
    })
    hitZone.on('pointerdown', () => this._continue())
  }

  _drawBtn (gfx, x, y, w, h, hovered) {
    gfx.fillStyle(hovered ? 0x2244aa : 0x333333, hovered ? 0.9 : 0.7)
    gfx.fillRoundedRect(x, y, w, h, 6)
    gfx.lineStyle(1, 0xffffff, 0.4)
    gfx.strokeRoundedRect(x, y, w, h, 6)
  }

  _showFeedback (x, y, text, color) {
    try {
      const msg = this.add.text(x, y, text, {
        fontFamily: 'monospace', fontSize: '16px', color,
        stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5)
      if (this.tweens) {
        this.tweens.add({
          targets: msg, y: y - 25, alpha: 0, duration: 800,
          onComplete: () => { if (msg?.destroy) msg.destroy() }
        })
      }
    } catch (_) {}
  }

  /**
   * Apply purchase immediately so the team panel reflects changes.
   */
  _applyImmediately (key, targetIndex) {
    const member = this._team[targetIndex]
    if (!member?.ref) return

    const target = member.ref
    const gameScene = this.scene.get('GameScene')

    switch (key) {
      case 'manzana':
        if (target.heal) target.heal(2)
        member.hp = target.hp
        break
      case 'maruchan':
        if (target.heal) target.heal(5)
        member.hp = target.hp
        break
      case 'energetica':
        if (gameScene?.effectSystem) gameScene.effectSystem.applyEffect(target, 'energetica', 6)
        break
      case 'botellita':
        if (gameScene?.globalCounter) {
          gameScene.globalCounter.molotovs += 1
          member.molotovs = gameScene.globalCounter.molotovs
        }
        break
    }

    // Update the team card visuals
    this._refreshTeamCard(targetIndex)
  }

  /**
   * Refresh a team card's HP bar and text after a purchase.
   */
  _refreshTeamCard (index) {
    const card = this._teamCards[index]
    if (!card) return
    const member = this._team[index]

    // Update HP bar
    const hpBarX = card.x + 12
    const hpBarY = card.y + 36
    const hpBarW = card.w - 24
    this._drawHpBar(card.hpGfx, hpBarX, hpBarY, hpBarW, 10, member.hp, member.maxHp)

    // Update HP text
    card.hpText.setText(`${member.hp}/${member.maxHp} HP`)

    // Update weapon text (player only)
    if (card.weaponText && member.isPlayer) {
      card.weaponText.setText(`🪨 piedra  🔥 ×${member.molotovs}`)
    }
  }

  _continue () {
    const gameScene = this.scene.get('GameScene')
    this.scene.stop('ShopScene')
    this.scene.resume('GameScene')
    if (gameScene?._proceedTransition) {
      gameScene._proceedTransition(this._targetMap)
    }
  }
}

export { SHOP_ITEMS }
