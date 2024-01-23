import {
  currentNodeIdAtom,
  edgesAtom,
  inputValuesAtom,
  isAppRunningAtom,
  nodesAtom,
  variablesAtom,
} from "@/atoms/chart";
import { useAtom } from "jotai";
import { useState } from "react";
import toast from "react-hot-toast";

const PlayerControls = () => {
  const [isAppRunning, setIsAppRunning] = useAtom(isAppRunningAtom);
  const [variables, setVariables] = useAtom(variablesAtom);
  const [isPlayingByStep, setIsPlayingByStep] = useState(false);

  const [nodes] = useAtom(nodesAtom);
  const [inputValues] = useAtom(inputValuesAtom);
  const [currentNodeId, setCurrentNodeId] = useAtom(currentNodeIdAtom);
  const [edges] = useAtom(edgesAtom);

  function play() {
    setVariables({});
    setIsAppRunning(true);

    let passedNodeId = "";

    try {
      const startBlockAmount = nodes.filter(
        (node) => node.type === "startEndBlock" && node?.data?.label === "Start"
      ).length;
      if (startBlockAmount > 1) {
        throw new Error("There should be only one start block!");
      }

      const startBlock = nodes.find(
        (node) => node.type === "startEndBlock" && node?.data?.label === "Start"
      );
      if (!startBlock) {
        throw new Error("There is no start block!");
      }

      passedNodeId = startBlock.id;
      setCurrentNodeId(passedNodeId);
    } catch (e) {
      toast.error(e?.message ?? e);
      stopPlaying();
    }

    setTimeout(() => {
      proceedToNextStep(passedNodeId);
    }, 1000);
  }

  function playByStep() {
    setVariables({});
    setIsPlayingByStep(true);
    setIsAppRunning(true);

    try {
      const startBlockAmount = nodes.filter(
        (node) => node.type === "startEndBlock" && node?.data?.label === "Start"
      ).length;
      if (startBlockAmount > 1) {
        throw new Error("There should be only one start block!");
      }

      const startBlock = nodes.find(
        (node) => node.type === "startEndBlock" && node?.data?.label === "Start"
      );
      if (!startBlock) {
        throw new Error("There is no start block!");
      }

      setCurrentNodeId(startBlock.id);
    } catch (e) {
      toast.error(e?.message ?? e);
      stopPlaying();
    }
  }

  function executeBlockAction(passedNodeId) {
    const block = nodes.find((node) => node.id === passedNodeId);
    if (!block) {
      throw new Error("Current block is not found!");
    }

    if (block.type === "startEndBlock" && block?.data?.label === "Start") {
      return;
    }

    const blockValue = inputValues[passedNodeId];
    if (!blockValue) {
      throw new Error("Block value is not found!");
    }

    switch (block.type) {
      case "dataBlock": {
        const blockInstructions = blockValue
          .replaceAll("\n", "")
          .replaceAll(" ", "")
          .split(";");

        blockInstructions.pop();
        blockInstructions.forEach((instruction) => {
          const [variable, value] = instruction.split("=");
          setVariables((prev) => ({
            ...prev,
            [variable]: value ?? null,
          }));
        });
        break;
      }
      case "processBlock": {
        const blockInstructions = blockValue.replaceAll("\n", "").split(";");

        blockInstructions.pop();
        blockInstructions.forEach((instruction) => {
          if (instruction.includes("++")) {
            const variable = instruction.slice(0, instruction.indexOf("++"));
            setVariables((prev) => ({
              ...prev,
              [variable]: Number(prev[variable]) + 1,
            }));
            return;
          }

          if (instruction.includes("--")) {
            const variable = instruction.slice(0, instruction.indexOf("--"));
            setVariables((prev) => ({
              ...prev,
              [variable]: Number(prev[variable]) - 1,
            }));
            return;
          }

          if (instruction.includes("+=")) {
            const [variable, value] = instruction.split("+=");
            setVariables((prev) => ({
              ...prev,
              [variable]: Number(prev[variable]) + Number(value),
            }));
            return;
          }

          if (instruction.includes("-=")) {
            const [variable, value] = instruction.split("-=");
            setVariables((prev) => ({
              ...prev,
              [variable]: Number(prev[variable]) - Number(value),
            }));
            return;
          }

          if (instruction.includes("*=")) {
            const [variable, value] = instruction.split("*=");
            setVariables((prev) => ({
              ...prev,
              [variable]: Number(prev[variable]) * Number(value),
            }));
            return;
          }

          if (instruction.includes("/=")) {
            const [variable, value] = instruction.split("/=");
            setVariables((prev) => ({
              ...prev,
              [variable]: Number(prev[variable]) / Number(value),
            }));
            return;
          }

          if (instruction.includes("print")) {
            return toast(instruction.slice(6), { icon: "📝", duration: 5000 });
          }

          const [variable, assignment] = instruction.split("=");

          const words = assignment.split(" ");

          const mappedWords = words.map((word) => {
            if (word.includes("[")) {
              const variableName = word.slice(0, word.indexOf("["));
              const variableValue = variables[variableName];
              if (!variableValue) {
                throw new Error("Variable is not found!");
              }
              const variableIndex = word.charAt(word.indexOf("[") + 1);
              return eval(`${variableValue}[${variableIndex}]`);
            }

            return variables[word] ?? word;
          });

          const value = eval(mappedWords.join(" "));

          setVariables((prev) => ({
            ...prev,
            [variable.trim()]: value,
          }));
        });
        break;
      }
      case "decisionBlock": {
        const blockInstructions = blockValue.replaceAll("\n", "").split(";");

        blockInstructions.pop();
        if (blockInstructions.length !== 1) {
          throw new Error("Decision block should have only one instruction!");
        }

        const instruction = blockInstructions[0];

        const words = instruction.split(" ");

        const mappedWords = words.map((word) => {
          if (word.includes("[")) {
            const variableName = word.slice(0, word.indexOf("["));
            const variableValue = variables[variableName];
            if (!variableValue) {
              throw new Error("Variable is not found!");
            }
            const variableIndex = word.charAt(word.indexOf("[") + 1);
            return eval(`${variableValue}[${variableIndex}]`);
          }

          return variables[word] ?? word;
        });

        const value = eval(mappedWords.join(" "));
        return value;
      }
      default:
        throw new Error("Block type is not found!");
    }
  }

  function proceedToNextStep(passedNodeId) {
    try {
      const nodeIdToLookFor = passedNodeId || currentNodeId;
      const currentNode = nodes.find((node) => node.id === nodeIdToLookFor);
      if (!currentNode) {
        throw new Error("Current block is not found!");
      }

      if (
        currentNode.type === "startEndBlock" &&
        currentNode?.data?.label === "End"
      ) {
        return stopPlaying();
      }

      const value = executeBlockAction(nodeIdToLookFor);

      if (currentNode.type === "decisionBlock") {
        let sourceHandle;
        if (value) {
          sourceHandle = "a";
        } else {
          sourceHandle = "b";
        }

        const currentEdge = edges.find(
          (edge) =>
            edge.source === nodeIdToLookFor &&
            edge?.sourceHandle === sourceHandle
        );
        if (!currentEdge) {
          throw new Error("Block is not connected!");
        }

        const nextNode = nodes.find((node) => node.id === currentEdge.target);
        if (!nextNode) {
          throw new Error("Block is not connected!");
        }

        setCurrentNodeId(nextNode.id);
        if (!isPlayingByStep) {
          setTimeout(() => {
            proceedToNextStep(nextNode.id);
          }, 1000);
        }
        return;
      }

      const currentEdge = edges.find((edge) => edge.source === nodeIdToLookFor);
      if (!currentEdge) {
        throw new Error("Block is not connected!");
      }

      const nextNode = nodes.find((node) => node.id === currentEdge.target);
      if (!nextNode) {
        throw new Error("Block is not connected!");
      }

      setCurrentNodeId(nextNode.id);

      if (!isPlayingByStep) {
        setTimeout(() => {
          proceedToNextStep(nextNode.id);
        }, 1000);
      }
    } catch (e) {
      toast.error(e?.message ?? e);
      stopPlaying();
    }
  }

  function stopPlaying() {
    setIsPlayingByStep(false);
    setIsAppRunning(false);
    setCurrentNodeId("");

    let id = window.setTimeout(function () {}, 0);

    while (id--) {
      window.clearTimeout(id); // will do nothing if no timeout with id is present
    }
  }

  return (
    <div className="absolute right-2 top-2 flex gap-2" id="player-controls">
      {isAppRunning ? (
        <>
          <button
            onClick={stopPlaying}
            className="border-[1.5px] text-sm border-black p-1 rounded-lg"
          >
            Stop
          </button>
          {isPlayingByStep && (
            <button
              onClick={() => proceedToNextStep()}
              className="border-[1.5px] text-sm border-black p-1 rounded-lg"
            >
              Next step
            </button>
          )}
        </>
      ) : (
        <>
          <button
            onClick={play}
            className="border-[1.5px] text-sm border-black p-1 rounded-lg"
          >
            Play
          </button>
          <button
            onClick={playByStep}
            className="border-[1.5px] text-sm border-black p-1 rounded-lg"
          >
            Play by step
          </button>
        </>
      )}
    </div>
  );
};
export default PlayerControls;
