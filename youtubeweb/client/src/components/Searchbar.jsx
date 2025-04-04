// src/components/Searchbar.jsx
import React from "react";
import "./Searchbar.css";

const SearchBar = ({ value, onChange, placeholder }) => {
    return (
        <input
            className="notes-searchbar"
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
        />
    );
};

export default SearchBar;
