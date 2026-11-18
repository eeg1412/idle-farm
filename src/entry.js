const estateEditorHash = '#/estate-layout';
const isEstateEditorRoute = () => window.location.hash.split('?', 1)[0] === estateEditorHash;
const estateEditorMode = isEstateEditorRoute();
let reloading = false;

function reloadOnModeChange(event) {
  if (isEstateEditorRoute() === estateEditorMode) return;

  // The running game's route handler can normalize the editor URL back to its map.
  event.stopImmediatePropagation();
  if (reloading) return;
  reloading = true;
  window.location.reload();
}

window.addEventListener('popstate', reloadOnModeChange);
window.addEventListener('hashchange', reloadOnModeChange);
window.addEventListener('pageshow', reloadOnModeChange);

if (estateEditorMode) {
  const canvas = document.querySelector('#game');
  const title = '庄园摆放编辑器';
  document.title = title;
  canvas.setAttribute('aria-label', title);
  const { startEstateEditor } = await import('./view/estate-editor.js');
  await startEstateEditor(canvas);
} else {
  await import('./main.js');
}
