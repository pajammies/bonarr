<script lang="ts">
  import { backendStatus, backendMessage, checkBackend } from '../lib/backendStatus';
  import { onMount } from 'svelte';
  onMount(() => { checkBackend(); });
</script>

<style>
  .banner { padding: 8px 12px; border-radius: 6px; margin: 12px 0; font-size: 0.95rem; }
  .online { background: #e6ffed; color: #056608; border: 1px solid #9ae6b4; }
  .offline { background: #ffe6e6; color: #8a0b0b; border: 1px solid #feb2b2; }
  .checking { background: #f7fafc; color: #4a5568; border: 1px solid #e2e8f0; }
</style>

<h1>Home</h1>
<div class="banner { $backendStatus }">
  <strong>Backend:</strong> {$backendMessage}
  <button style="margin-left:8px" on:click={checkBackend}>Recheck</button>
</div>

<p>Welcome to your app. Use the nav to explore pages.</p>
