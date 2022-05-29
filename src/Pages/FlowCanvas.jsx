import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  MiniMap,
  updateEdge,
  MarkerType,
} from "react-flow-renderer";
import TextField from "@mui/material/TextField";
import { Layout, Sidebar } from "../components";
import "../assets/Css/updatenode.css";
import "../index.css";
import { GrAdd } from "react-icons/gr";
import { Grid } from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import DynOutputHandle from "../components/FlowComponents/Handler/DynOutputHandle";
import DynInputHandle from "../components/FlowComponents/Handler/DynInputHandle";
import CustomInputNode from "../components/FlowComponents/Nodes/CustomInputNode";
import CustomOutputNode from "../components/FlowComponents/Nodes/CustomOutputNode";
import CustomEdge from "../components/FlowComponents/CustomEdge";
import ConnectionLine from "../components/FlowComponents/CustomEdge/ConnectionLine";
// import SummaryNodes from "../components/FlowComponents/SummaryNodes";

const CustomFunctionNode = ({ data }, props) => {
  const [outputcount, setOutputCount] = useState(1);
  const [inputcount, setInputCount] = useState(1);

  return (
    <>
      <div className="py-1 hover:border-green-500 rounded-md border-2 p-3 shadow-xl">
        <div className="my-1">
          <GrAdd onClick={() => setOutputCount((i) => i + 1)} />
        </div>
        <hr />
        <div>
          {Array(outputcount)
            .fill(null)
            .map((_, i) => (
              <DynOutputHandle key={i} idx={i} />
            ))}
        </div>
        <div>
          {Array(inputcount)
            .fill(null)
            .map((_, i) => (
              <DynInputHandle key={i} idx={i} />
            ))}
        </div>
        {data.label}
        <hr />
        <div className="text sm fill-purple-700 hover:fill-green-500 my-1">
          <GrAdd onClick={() => setInputCount((i) => i + 1)} />
        </div>
      </div>
    </>
  );
};

const FlowCanvas = () => {
  const reactFlowWrapper = useRef(null);
  const flowImageDownloadRef = useRef();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [openEditor, setOpenEditor] = useState(false);
  const [nodeName, setNodeName] = useState("NULL");
  const [nodeBg, setNodeBg] = useState("NULL");
  const [group, setGroup] = useState("");
  const nodeTypes = useMemo(
    () => ({
      customOutput: CustomOutputNode,
      customInput: CustomInputNode,
      customFunction: CustomFunctionNode,
    }),
    []
  );
  const edgeTypes = useMemo(
    () => ({
      custom: CustomEdge,
    }),
    []
  );
  const [sizeX, setSizeX] = useState(0);
  const [sizeY, setSizeY] = useState(0);
  const [type, setType] = useState();
  const [parent, setParent] = useState();
  const [id, setID] = useState();
  const [jsonInput, setJsonInput] = useState("");

  const convert = useCallback(
    (event) => {
      const jsonNode = JSON.parse(jsonInput);
      const filteredEdges = jsonNode.filter((item) => item.type === "edge");
      const filteredNodes = jsonNode.filter((item) => item.type !== "edge");
      console.log({ filteredEdges, filteredNodes });
      setNodes((nds) => nds.concat(filteredNodes));
      setEdges((nds) => nds.concat(filteredEdges));
    },
    [jsonInput, setNodes, setEdges]
  );

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "edge",
            animated: false,
            style: { stroke: "black" },
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        let x = 0;
        let y = 0;
        if (node.id === parent) {
          x = node.position.x;
          y = node.position.y;
          console.log("parent: " + node.id + " " + parent);
          console.log("parent posx: " + x);
          console.log("parent posy: " + y);
        } else if (node.selected === true && node.type !== "group") {
          node.parentNode = parent;
          node.position.x = x;
          node.position.y = y;
          node.extent = "parent";
        }
        return node;
      })
    );
  }, [parent, setNodes]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.selected === true) {
          node.data = {
            ...node.data,
            label: nodeName,
          };
          node.style = { ...node.style, backgroundColor: nodeBg };
          console.log("size: " + sizeX);

          node.style.width = parseInt(sizeX);
          node.style.height = parseInt(sizeY);

          // node.style={...node.style, height:sizeY}
          // node.style={...node.style, width:sizeX}
        }

        return node;
      })
    );
  }, [nodeName, nodeBg, sizeX, sizeY, setNodes]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.selected === true) {
          console.log("selected found");
          // when you update a simple type you can just update the value
          node.type = "group";

          setType(node.type);

          setGroup("");
        }
        console.log("not selected");
        return node;
      })
    );
  }, [group, setNodes]);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("application/reactflow/label");
      const bgCol = event.dataTransfer.getData("application/reactflow/color");
      console.log({ bgCol });
      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      let heightl = 50;
      let w = 200;
      if (type === "customFunction") {
        heightl = 80;
      }

      const newNode = {
        id: `flow_azim_renderer_${uuidv4()}`,
        type,
        position,
        data: { label: `${label}` },
        style: {
          backgroundColor: bgCol,
          width: w,
          height: heightl,
          borderRadius: 6,
          borderColor: "#1111",
        },
      };
      // setType(type)
      // setNodeBg(bgCol)
      // setNodeName(label)
      setNodes((nds) => nds.concat(newNode));
      // setSizeX(w)
      // setSizeY(heightl)
    },
    [reactFlowInstance, setNodes]
  );
  const onNodeClick = (event, node) => {
    setOpenEditor(true);
    event.preventDefault();
    setNodeBg(node.style.backgroundColor);
    setNodeName(node.data.label);
    setSizeX(node.style.width);
    setSizeY(node.style.height);
    setType(node.type);
    setID(node.id);
    if (node.type === "group") {
    }

    console.log("type: " + node.type);
    console.log("x " + node.style.width);
    console.log("y " + node.style.height);
    console.log("id: " + node.id);
    console.log("parent: " + node.parentNode);
  };

  const onPaneClick = (event) => setOpenEditor(false);
  const onEdgeUpdate = (oldEdge, newConnection) =>
    setEdges((els) => updateEdge(oldEdge, newConnection, els));
  const graphStyles = { width: "100%", height: "650px", Background: "white" };
  return (
    <Layout
      jsonInput={jsonInput}
      setJsonInput={setJsonInput}
      convert={convert}
      flowImageDownloadRef={flowImageDownloadRef}
      downloadJSON={[...edges, ...nodes]}
    >
      <div className="bg-indigo-100 py-2">
        <div className>
          <Grid container spacing={2}>
            <Grid item xs={2}>
              <Sidebar />
            </Grid>
            <Grid ref={flowImageDownloadRef} item xs={10}>
              <div
                className=" bg-indigo-100 rounded-md my-1 mx-2 border-2 border-indigo-400"
                ref={reactFlowWrapper}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onEdgeUpdate={onEdgeUpdate}
                  connectionLineComponent={ConnectionLine}
                  connectionLineType="smoothstep"
                  onNodeDragStart={(event, node) => {
                    event.preventDefault();
                    setNodeBg(node.style.backgroundColor);
                    setNodeName(node.data.label);
                    setSizeX(node.style.width);
                    setSizeY(node.style.height);
                    setType(node.type);
                    setID(node.id);
                    console.log("type: " + node.type);
                    console.log("x " + node.style.width);
                    console.log("y " + node.style.height);
                  }}
                  onPaneClick={onPaneClick}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onNodeClick={onNodeClick}
                  style={graphStyles}
                >
                  <MiniMap />

                  {openEditor && (
                    <div className="updatenode__controls ">
                      <div className="grid grid-cols-1 divide-y divide-black">
                        <div>
                          <TextField
                            value={nodeName}
                            label={`Label:`}
                            onChange={(evt) => setNodeName(evt.target.value)}
                            id="outlined-basic"
                            variant="outlined"
                          />
                          <TextField
                            label={`Background:`}
                            value={nodeBg}
                            onChange={(evt) => setNodeBg(evt.target.value)}
                            id="outlined-basic"
                            variant="outlined"
                          />

                          <div className="updatenode__checkboxwrapper">
                            <label>Group</label>
                            <button
                              className="rounded-md text-black bg-white hover:bg-rose-400 my-1 py-1 px-1"
                              onClick={(evt) => setGroup("a")}
                            >
                              {" "}
                              Make Group
                            </button>
                          </div>
                          <TextField
                            label={`Width:`}
                            value={sizeX}
                            onChange={(evt) => setSizeX(evt.target.value)}
                            id="outlined-basic"
                            variant="outlined"
                          />
                          <TextField
                            label={`Height:`}
                            value={sizeY}
                            onChange={(evt) => setSizeY(evt.target.value)}
                            id="outlined-basic"
                            variant="outlined"
                          />
                          <div>
                            <div className="py-1">Info:</div>
                            <div
                              style={{
                                fontWeight: "600",
                                whiteSpace: "nowrap",
                                width: "180px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              Type: {type}
                            </div>
                            <div
                              style={{
                                fontWeight: "600",
                                whiteSpace: "nowrap",
                                width: "180px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              ID: {id}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* <div>
                        <div>Nodes on Board:</div>
                        <div className="py-1 px-1 border-2 h-36 rounded-md overflow-y-scroll">
                          {nodes.map((node, key) => (
                            <SummaryNodes
                              key={key}
                              node={node}
                              setParent={setParent}
                            />
                          ))}
                        </div>
                      </div> */}
                    </div>
                  )}

                  <Controls />
                  <Background gap={8} color="black" />
                </ReactFlow>
              </div>
            </Grid>
          </Grid>
        </div>
      </div>
    </Layout>
  );
};

export default FlowCanvas;
