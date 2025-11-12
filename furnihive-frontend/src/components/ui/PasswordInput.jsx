import { useState } from "react";
import Input from "./Input.jsx";

export default function PasswordInput(props){
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} {...props} />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:underline"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
