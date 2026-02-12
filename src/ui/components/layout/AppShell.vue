<template>
  <section class="app-shell">
    <header class="app-shell__header">
      <div class="app-shell__menu">
        <slot name="menu" />
      </div>
      <div class="app-shell__toolbar">
        <slot name="toolbar" />
      </div>
    </header>
    <main class="app-shell__content">
      <slot />
    </main>
  </section>
</template>
