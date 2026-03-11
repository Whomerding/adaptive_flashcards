import React from "react";
import "../styles/child.css";

function Child(props) {
  const handleClick = (e) => {
    const deckId = Number(e.currentTarget.value);
    props.chooseDeck(deckId, props.id);
  };

  return (
    <div className="col">
     <div className="card">
      <div className="card-body">
        <img src={`/avatars/${props.child.avatar}.png`} className="card-avatar " alt="avatar" />
      
    <div className="card-body">
    <h5 className="card-title text-center">{props.child.name}</h5>
    </div>
    <div className="container">
      <div class="row row-cols-sm-2 rows-cold-med-4 g-3">
      
        <div className="operation col">
          <button className="deck-button" onClick={handleClick} disabled={props.loading} value={3}>
            {props.loading ? "Loading..." : <img src="../img/Addition.png" className= "operation-img" alt="Addition"></img>}
          </button>
        </div>
        <div className="operation col">
          <button className="deck-button" onClick={handleClick} disabled={props.loading} value={4}>
            {props.loading ? "Loading..." : <img src="../img/Subtraction.png" className= "operation-img" alt="Subtraction"></img>}
          </button>
        </div>
                <div className="operation col">
          <button className="deck-button" onClick={handleClick} disabled={props.loading} value={1}>
            {props.loading ? "Loading..." : <img src="../img/Multiplication.png" className= "operation-img" alt="Multiplication"></img>}
          </button>
        </div>
        <div className="operation col">
          <button className="deck-button" onClick={handleClick} disabled={props.loading} value={2}>
            {props.loading ? "Loading..." : <img src="../img/Division.png" className= "operation-img" alt="Division"></img>}
          </button>
        </div>
      </div>
      </div>
    </div>
    </div>
    </div>
  );
}
export default Child;