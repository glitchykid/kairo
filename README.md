# Kairo

Browser-based 3D scene editor built with Vue 3 and Three.js.

[English](#english) | [Русский](#русский)

---

## English

### About

Kairo is a lightweight, browser-based 3D editor for composing scenes from primitives, imported models, and lights. It runs entirely in the browser with no server required — scenes and assets are persisted locally via IndexedDB.

### Features

- **Primitives** — Box, Sphere, Cylinder, Cone, Torus, Plane with full position / rotation / scale controls
- **Model Import** — GLTF, GLB, OBJ, FBX, STL, PLY, Collada (.dae), 3MF, USDZ
- **Lighting** — Directional lights with real-time scene illumination and billboard gizmos
- **Viewport** — Interactive 3D viewport with orbit, pan, and FPS-style WASD flight camera
- **Perspective & Orthographic** — Switch projection modes with matched frustum
- **Display Modes** — Solid, wireframe (edge-overlay based, no triangle diagonals), polygon edges, vertices
- **Anti-aliased Edges** — Polygon edges rendered with fat lines (LineSegments2 / LineMaterial) for smooth display
- **Transform Gizmos** — Translate (1), Rotate (2), Scale (3) with keyboard mode switching
- **Selection Indicator** — BoxHelper outline on the selected object
- **Scene Inspector** — Right panel with object list, transform editor, and scene renaming
- **Persistence** — Scenes and imported model blobs stored in IndexedDB via Dexie
- **Internationalization** — English, Russian, Korean, Japanese
- **Performance** — Logarithmic depth buffer, ACES tone mapping, object pooling, polygon offset for z-fighting prevention
- **Desktop Only** — Designed for desktop screens with keyboard + mouse input

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| 3D Engine | Three.js |
| State | Pinia |
| Storage | IndexedDB (Dexie) |
| UI Components | Element Plus |
| Language | TypeScript |
| Build | Vite |
| Tests | Vitest + jsdom |
| Linting | ESLint + oxlint |
| Formatting | Prettier |

### Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- A modern browser with WebGL support

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm run test:unit

# Run tests with coverage
npm run test:coverage

# Type-check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint

# Format
npm run format
```

### Project Structure

```
src/
├── core/scene/          # Scene data types (SceneNode, LightNode, Transform)
├── features/
│   ├── editor/          # EditorWorkspace, model import, hotkeys
│   ├── scene/           # Scene use-cases (add/remove/update nodes)
│   └── viewport/        # Viewport helpers (objects, lighting, display, constants)
├── localization/        # i18n messages (en, ru, ko, ja)
├── stores/              # Pinia store (editor state, persistence)
├── styles/              # CSS (tokens, base, layout, components)
├── ui/components/       # Vue components (panels, viewport, menu, layout)
└── __tests__/           # Vitest test suites (15 files, 145+ tests)
```

### Hotkeys

| Key | Action |
|---|---|
| W / A / S / D | Camera flight (relative to view direction) |
| Space | Ascend |
| Shift | Descend |
| Scroll wheel | Adjust camera speed |
| 1 | Translate mode |
| 2 | Rotate mode |
| 3 | Scale mode |
| Right-click | Context menu (add primitives, lights, import) |
| Left-click | Select object |
| Middle-click | Orbit / Pan (+ Shift) |

### License

MIT

---

## Русский

### О проекте

Kairo — это легковесный браузерный 3D-редактор для компоновки сцен из примитивов, импортированных моделей и источников света. Работает полностью в браузере без сервера — сцены и ассеты сохраняются локально через IndexedDB.

### Возможности

- **Примитивы** — Куб, Сфера, Цилиндр, Конус, Тор, Плоскость с полным управлением позицией / вращением / масштабом
- **Импорт моделей** — GLTF, GLB, OBJ, FBX, STL, PLY, Collada (.dae), 3MF, USDZ
- **Освещение** — Направленные источники света с билборд-гизмо
- **Вьюпорт** — Интерактивный 3D-вьюпорт с орбитальной камерой, панорамированием и полётной камерой WASD
- **Перспектива и ортография** — Переключение режимов проекции с согласованным фрустумом
- **Режимы отображения** — Сплошной, каркасный (на основе рёбер, без диагоналей треугольников), рёбра полигонов, вершины
- **Сглаженные рёбра** — Рёбра полигонов отрисовываются утолщёнными линиями (LineSegments2 / LineMaterial) для гладкого отображения
- **Гизмо трансформации** — Перемещение (1), Вращение (2), Масштабирование (3) с переключением клавишами
- **Индикатор выделения** — BoxHelper-контур вокруг выбранного объекта
- **Инспектор сцены** — Правая панель со списком объектов, редактором трансформаций и переименованием сцены
- **Сохранение** — Сцены и блобы моделей хранятся в IndexedDB через Dexie
- **Интернационализация** — Английский, русский, корейский, японский
- **Производительность** — Логарифмический буфер глубины, ACES тональная компрессия, пулинг объектов, polygon offset для устранения z-файтинга
- **Только десктоп** — Рассчитан на десктопные экраны с вводом клавиатура + мышь

### Технологии

| Слой | Технология |
|---|---|
| Фреймворк | Vue 3 (Composition API, `<script setup>`) |
| 3D-движок | Three.js |
| Состояние | Pinia |
| Хранилище | IndexedDB (Dexie) |
| UI-компоненты | Element Plus |
| Язык | TypeScript |
| Сборка | Vite |
| Тесты | Vitest + jsdom |
| Линтинг | ESLint + oxlint |
| Форматирование | Prettier |

### Требования

- Node.js `^20.19.0` или `>=22.12.0`
- Современный браузер с поддержкой WebGL

### Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск сервера разработки
npm run dev

# Запуск тестов
npm run test:unit

# Запуск тестов с покрытием
npm run test:coverage

# Проверка типов
npm run type-check

# Сборка для продакшена
npm run build

# Предпросмотр продакшен-сборки
npm run preview

# Линтинг
npm run lint

# Форматирование
npm run format
```

### Структура проекта

```
src/
├── core/scene/          # Типы данных сцены (SceneNode, LightNode, Transform)
├── features/
│   ├── editor/          # EditorWorkspace, импорт моделей, горячие клавиши
│   ├── scene/           # Сценарии сцены (добавление/удаление/обновление узлов)
│   └── viewport/        # Утилиты вьюпорта (объекты, освещение, отображение)
├── localization/        # Сообщения i18n (en, ru, ko, ja)
├── stores/              # Pinia-стор (состояние редактора, персистенция)
├── styles/              # CSS (токены, база, макет, компоненты)
├── ui/components/       # Vue-компоненты (панели, вьюпорт, меню, макет)
└── __tests__/           # Тестовые наборы Vitest (15 файлов, 145+ тестов)
```

### Горячие клавиши

| Клавиша | Действие |
|---|---|
| W / A / S / D | Полёт камеры (относительно направления взгляда) |
| Пробел | Подъём |
| Shift | Спуск |
| Колесо мыши | Регулировка скорости камеры |
| 1 | Режим перемещения |
| 2 | Режим вращения |
| 3 | Режим масштабирования |
| ПКМ | Контекстное меню (примитивы, свет, импорт) |
| ЛКМ | Выбор объекта |
| СКМ | Орбита / Панорамирование (+ Shift) |

### Лицензия

MIT
