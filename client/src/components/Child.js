import React from 'react';

function Child(props) {
   
const handleClick = (e) => {
    console.log("Deck ID:", e.target.value, "Child ID:", props.id);
    props.chooseDeck(e.target.value, props.id);
  };

  return (
    <div>
    <li>{props.name}</li>
    <ul>
      <li>Deck 1 <button onClick={handleClick} value={3}>Addition</button></li>
      <li>Deck 2 <button onClick={handleClick} value={4}>Subtraction</button></li>
        <li>Deck 3 <button onClick={handleClick} value={1}>Multiplication</button></li>
        <li>Deck 4 <button onClick={handleClick} value={2}>Division</button></li>    
    </ul>
    </div>
  );
}

export default Child;