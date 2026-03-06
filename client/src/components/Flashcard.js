
export default function Flashcard({ deck }) {
  return (
    <div>
        <h2>{deck.prompt} = {deck.answer}</h2>
    </div>
  );
}   