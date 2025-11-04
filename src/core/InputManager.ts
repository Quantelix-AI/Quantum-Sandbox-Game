export type KeyBinding = "up" | "down" | "left" | "right" | "action" | "jump" | "sprint" | "tab";

export interface MouseState {
  x: number;
  y: number;
  leftButton: boolean;
  rightButton: boolean;
  middleButton: boolean;
  wheelDelta: number;
}

export interface InputState {
  keys: Map<KeyBinding, boolean>;
  mouse: MouseState;
  mouseTarget: { x: number; y: number } | null;
}

const DEFAULT_BINDINGS: Record<string, KeyBinding> = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyE: "action",
  Space: "jump",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  Tab: "tab",
};

export class InputManager {
  private readonly activeBindings = new Map<KeyBinding, boolean>();
  private readonly listeners: Array<() => void> = [];
  private mouseState: MouseState = {
    x: 0,
    y: 0,
    leftButton: false,
    rightButton: false,
    middleButton: false,
    wheelDelta: 0,
  };
  private mouseTarget: { x: number; y: number } | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(private readonly bindings: Record<string, KeyBinding> = DEFAULT_BINDINGS) {}

  initialize(canvas?: HTMLCanvasElement): void {
    if (typeof window === "undefined") return;

    this.canvas = canvas || document.querySelector('canvas');
    console.log('[InputManager] 初始化，canvas:', this.canvas ? '已获取' : '未获取');

    // 键盘事件处理
    const keyDownHandler = (event: KeyboardEvent) => {
      const binding = this.bindings[event.code];
      if (binding) {
        this.activeBindings.set(binding, true);
        // 阻止Tab键的默认行为
        if (binding === "tab") {
          event.preventDefault();
        }
      }
    };

    const keyUpHandler = (event: KeyboardEvent) => {
      const binding = this.bindings[event.code];
      if (binding) {
        this.activeBindings.set(binding, false);
      }
    };

    // 鼠标事件处理
    const mouseDownHandler = (event: MouseEvent) => {
      if (!this.canvas) return;
      
      const rect = this.canvas.getBoundingClientRect();
      this.mouseState.x = event.clientX - rect.left;
      this.mouseState.y = event.clientY - rect.top;

      switch (event.button) {
        case 0: // 左键
          this.mouseState.leftButton = true;
          // 设置鼠标目标位置（世界坐标需要后续转换）
          this.mouseTarget = { x: this.mouseState.x, y: this.mouseState.y };
          break;
        case 1: // 中键
          this.mouseState.middleButton = true;
          break;
        case 2: // 右键
          this.mouseState.rightButton = true;
          event.preventDefault(); // 阻止右键菜单
          break;
      }
    };

    const mouseUpHandler = (event: MouseEvent) => {
      switch (event.button) {
        case 0:
          this.mouseState.leftButton = false;
          break;
        case 1:
          this.mouseState.middleButton = false;
          break;
        case 2:
          this.mouseState.rightButton = false;
          break;
      }
    };

    const mouseMoveHandler = (event: MouseEvent) => {
      if (!this.canvas) return;
      
      const rect = this.canvas.getBoundingClientRect();
      this.mouseState.x = event.clientX - rect.left;
      this.mouseState.y = event.clientY - rect.top;
      // console.log('[InputManager] 鼠标移动:', this.mouseState.x, this.mouseState.y);
    };

    const wheelHandler = (event: WheelEvent) => {
      this.mouseState.wheelDelta = event.deltaY;
      event.preventDefault();
    };

    const contextMenuHandler = (event: Event) => {
      event.preventDefault(); // 阻止右键菜单
    };

    // 添加事件监听器
    window.addEventListener("keydown", keyDownHandler);
    window.addEventListener("keyup", keyUpHandler);
    
    if (this.canvas) {
      this.canvas.addEventListener("mousedown", mouseDownHandler);
      this.canvas.addEventListener("mouseup", mouseUpHandler);
      this.canvas.addEventListener("mousemove", mouseMoveHandler);
      this.canvas.addEventListener("wheel", wheelHandler);
      this.canvas.addEventListener("contextmenu", contextMenuHandler);
    }

    // 保存清理函数
    this.listeners.push(() => window.removeEventListener("keydown", keyDownHandler));
    this.listeners.push(() => window.removeEventListener("keyup", keyUpHandler));
    
    if (this.canvas) {
      this.listeners.push(() => this.canvas!.removeEventListener("mousedown", mouseDownHandler));
      this.listeners.push(() => this.canvas!.removeEventListener("mouseup", mouseUpHandler));
      this.listeners.push(() => this.canvas!.removeEventListener("mousemove", mouseMoveHandler));
      this.listeners.push(() => this.canvas!.removeEventListener("wheel", wheelHandler));
      this.listeners.push(() => this.canvas!.removeEventListener("contextmenu", contextMenuHandler));
    }
  }

  isActive(binding: KeyBinding): boolean {
    return this.activeBindings.get(binding) ?? false;
  }

  getMouseState(): MouseState {
    return { ...this.mouseState };
  }

  getMouseTarget(): { x: number; y: number } | null {
    return this.mouseTarget;
  }

  clearMouseTarget(): void {
    this.mouseTarget = null;
  }

  getInputState(): InputState {
    return {
      keys: new Map(this.activeBindings),
      mouse: { ...this.mouseState },
      mouseTarget: this.mouseTarget,
    };
  }

  // 重置滚轮增量（每帧调用）
  resetWheelDelta(): void {
    this.mouseState.wheelDelta = 0;
  }

  // 检查组合键
  isComboActive(primary: KeyBinding, modifier: KeyBinding): boolean {
    return this.isActive(primary) && this.isActive(modifier);
  }

  destroy(): void {
    this.listeners.forEach((fn) => fn());
    this.listeners.length = 0;
    this.activeBindings.clear();
    this.mouseTarget = null;
  }
}
