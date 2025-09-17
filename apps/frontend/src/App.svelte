<script lang="ts">
  import Router from './router';
  import { routes } from './router';
</script>

<nav style="display:flex; gap:12px; margin: 12px 0;">
  <a href="#/">Home</a>
  <a href="#/about">About</a>
  <a href="#/contact">Contact</a>
  <a href="#/settings">Settings</a>
  <a href="#/dashboard">Dashboard</a>
</nav>
<main>
  <Router {routes} />
</main>
