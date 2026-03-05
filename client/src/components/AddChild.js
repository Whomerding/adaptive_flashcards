import React from "react";


export default function AddChild(props) {
const [childName, setChildName] = React.useState("");

const handleSubmit = (e) => {
    e.preventDefault();
    props.handleSubmit(childName);
    setChildName("");
  };

const handleChange = (e) => {
    setChildName(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Child</h2>

      <input
        type="text"
        placeholder="Child Name"
        value={childName}
        onChange={handleChange}
      />
      <button type="submit" >
      </button>


    </form>
  );
}