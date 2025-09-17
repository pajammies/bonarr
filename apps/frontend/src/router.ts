import Router from 'svelte-spa-router';
import Home from './routes/Home.svelte';
import About from './routes/About.svelte';
import Contact from './routes/Contact.svelte';
import Settings from './routes/Settings.svelte';
import Dashboard from './routes/Dashboard.svelte';
import NotFound from './routes/NotFound.svelte';

export const routes = {
  '/': Home,
  '/about': About,
  '/contact': Contact,
  '/settings': Settings,
  '/dashboard': Dashboard,
  '*': NotFound
};

export default Router;
