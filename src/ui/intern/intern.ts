import { L } from '../../core/lang';
import { laptopPhase } from '../../systems/intern/incident';
import { short } from '../format';
import './intern.css';

export const INTERN_REPORT = L(
  'Стажёр закрыл крышку. Клод уговорил его открыть ноутбук снова.',
  'The intern is back in production. The lid must stay open.',
);

export class InternLaptop {
  private root: HTMLElement;
  private line: HTMLElement;
  private receipt: HTMLElement;
  private lane: HTMLElement;
  private lastPacket = -Infinity;

  constructor(layer: HTMLElement) {
    const root = document.createElement('section');
    root.className = 'intern-incident';
    root.hidden = true;
    root.innerHTML = `
      <strong>${L('Прод на ноутбуке стажёра', 'Production on the intern’s laptop')}</strong>
      <div class="intern-lane" aria-hidden="true"><div class="intern-wire"></div>
        <div class="intern-device"><i class="intern-screen"><i></i></i><i class="intern-base"></i></div>
      </div>
      <div class="intern-line"></div><small class="intern-receipt"></small>`;
    layer.append(root);
    this.root = root;
    this.line = root.querySelector('.intern-line')!;
    this.receipt = root.querySelector('.intern-receipt')!;
    this.lane = root.querySelector('.intern-lane')!;
  }

  show(elapsed: number, credit: number, replay = false): void {
    const phase = laptopPhase(elapsed);
    if (phase === 'done') return this.hide();
    if (!this.root.hidden && this.root.dataset.phase === phase && this.root.classList.contains('replay') === replay) return;
    this.root.hidden = false;
    this.root.classList.toggle('replay', replay);
    this.root.dataset.phase = phase;
    if (phase === 'routing') {
      this.line.textContent = L('Трафик переведён. Ноутбук на кухне.', 'Traffic switched. The laptop is in the kitchen.');
      this.receipt.textContent = L('Задачи идут через ноутбук.', 'Tasks are running on the laptop.');
    } else if (phase === 'closed') {
      this.line.textContent = L('Стажёр закрыл крышку. «Откройте, пожалуйста».', 'The intern shut the lid. “Please open it again.”');
      this.receipt.textContent = L('Обработка задач остановлена. Доход $0/с.', 'Processing stopped. Income $0/s.');
    } else {
      this.line.textContent = L('«Я просто хотел взять его с собой».', '“I just wanted to take it with me.”');
      this.receipt.textContent = replay
        ? L('Крышку открыли. Работу восстановили.', 'Lid opened. Service restored.')
        : L(`Работа восстановлена. Компенсация +$${short(credit)}.`, `Service restored. Credit +$${short(credit)}.`);
    }
  }

  /** One moving square represents actual work; a busy conveyor is sampled for readability. */
  task(): void {
    if (this.root.hidden || this.root.dataset.phase === 'closed' || performance.now() - this.lastPacket < 220) return;
    this.lastPacket = performance.now();
    const square = document.createElement('i');
    square.className = 'intern-task';
    this.lane.append(square);
    square.addEventListener('animationend', () => square.remove(), { once: true });
  }

  hide(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    for (const square of this.lane.querySelectorAll('.intern-task')) square.remove();
  }
}
