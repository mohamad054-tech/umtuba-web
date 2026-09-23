export default function FlagMark({ id }: { id: string }) {
  return (
    <img
      className="um-play-flagimg"
      src={`/games/flags/${id}.svg`}
      alt=""
      draggable={false}
    />
  );
}
