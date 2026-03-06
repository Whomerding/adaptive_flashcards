function Child(props) {
  const handleClick = (e) => {
    const deckId = Number(e.currentTarget.value);
    props.chooseDeck(deckId, props.id);
  };

  const handleDelete = () => {
    props.deleteChild(props.id);
  };

  return (
    <div>
      <li>{props.child.name}</li>
      <button onClick={handleDelete} disabled={props.loading}>
        Delete Child
      </button>

      <ul>
        <li>
          <button onClick={handleClick} disabled={props.loading} value={3}>
            {props.loading ? "Loading..." : "Addition"}
          </button>
        </li>
        <li>
          <button onClick={handleClick} disabled={props.loading} value={4}>
            {props.loading ? "Loading..." : "Subtraction"}
          </button>
        </li>
        <li>
          <button onClick={handleClick} disabled={props.loading} value={1}>
            {props.loading ? "Loading..." : "Multiplication"}
          </button>
        </li>
        <li>
          <button onClick={handleClick} disabled={props.loading} value={2}>
            {props.loading ? "Loading..." : "Division"}
          </button>
        </li>
      </ul>
    </div>
  );
}
export default Child;