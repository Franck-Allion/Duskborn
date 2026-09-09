import Phaser from 'phaser';

/** Keep scene coordinates in 960x540 logical units while rendering at screen density. */
export function fitSceneToCanvas(scene: Phaser.Scene): void {
  const resize = () => {
    const { width, height } = scene.scale.gameSize;
    const zoom = Math.min(width / 960, height / 540);
    scene.cameras.main.setSize(width, height).setZoom(zoom).centerOn(480, 270);

    const resolution = Math.max(1, Math.ceil(zoom));
    const updateText = (objects: Phaser.GameObjects.GameObject[]) => {
      for (const object of objects) {
        if (object instanceof Phaser.GameObjects.Text) {
          if (object.style.resolution !== resolution) {
            object.setResolution(resolution);
          }
        } else if (object instanceof Phaser.GameObjects.Container) {
          updateText(object.list);
        }
      }
    };
    updateText(scene.children.list);
  };

  resize();
  scene.scale.on(Phaser.Scale.Events.RESIZE, resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, resize);
  });
}
