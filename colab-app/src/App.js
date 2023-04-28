import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import * as Automerge from "@automerge/automerge";
import localforage from "localforage";
import Header from "./components/Header";
import ContentWrapper from "./components/ContentWrapper";
import DocumentCard from "./components/DocumentCard";
import AddButton from "./components/AddButton";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { v4 as uuidv4 } from "uuid";

let doc = Automerge.init();

export default function App() {
  const navigate = useNavigate();

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorValue, setEditorValue] = useState("");

  let docId = window.location.pathname.split("/").pop();
  let channel = useMemo(() => {
    return new BroadcastChannel(docId);
  }, [docId]);

  const initDocuments = useCallback(() => {
    if (localforage.getItem("automerge-data") && !docId) {
      setEditorVisible(false);
      async function getItem() {
        const url = `http://127.0.0.1:5000/automerge-data`
        const response = await fetch(url)
        const respbuffer = await response.arrayBuffer()
        const view = new Uint8Array(respbuffer)
        return view
        //return await localforage.getItem("automerge-data");
      }

      getItem()
        .then((item) => {
          if (item) {
            doc = Automerge.load(item);
            navigate(`/`);
          }
        })
        .catch((err) => console.log(err));
    }
  }, [navigate, docId]);

  useEffect(() => {
    initDocuments();
  }, [initDocuments]);

  const addDocument = async () => {
    const id = uuidv4();
    let newDoc = Automerge.change(doc, (doc) => {
      setEditorValue("");
      if (!doc.documents) doc.documents = [];
      doc.documents.push({
        id,
        text: editorValue,
        done: false
      });
      navigate(`/${id}`);
    });

    let binary = Automerge.save(newDoc);
    localforage.clear();
    //delete file
    let url = `http://127.0.0.1:5000/automerge-data`
    const del_response = await fetch(url, {
      body: binary,
      method: "delete",
    }).catch((err) => console.log(err));
    console.log(del_response)

    localforage
      .setItem("automerge-data", binary)
      .catch((err) => console.log(err));
    
    // Push to server
    const response = await fetch(url, {
      body: binary,
      method: "post",
      headers: {
        "Content-Type": "application/octet-stream",
      }
    }).catch((err) => console.log(err));
    console.log(response)

    doc = newDoc;
  };

  const loadDocument = useCallback(() => {
    if (docId) {
      setEditorVisible(true);
      async function getItem() {
        const url = `http://127.0.0.1:5000/automerge-data`
        const response = await fetch(url)
        const respbuffer = await response.arrayBuffer()
        const view = new Uint8Array(respbuffer)
        return view
        //return await localforage.getItem("automerge-data");
      }

      getItem()
        .then((item) => {
          if (item) {
            doc = Automerge.load(item);

            const itemIndex = doc.documents.findIndex(
              (item) => item.id === docId
            );
            if (itemIndex !== -1) {
              setEditorValue(doc.documents[itemIndex].text);
            } else {
              navigate("/");
              setEditorVisible(false);
            }
          }
        })
        .catch((err) => console.log(err));
    }
  }, [docId, navigate]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const updateDocument = useCallback(async () => {
    if (Object.keys(doc).length !== 0) {
      const itemIndex = doc.documents.findIndex((item) => item.id === docId);

      if (itemIndex !== -1) {
        let newDoc = Automerge.change(doc, (doc) => {
          doc.documents[itemIndex].text = editorValue;
        });

        let binary = Automerge.save(newDoc);
        localforage
          .setItem("automerge-data", binary)
          .catch((err) => console.log(err));

        // Update the server
        let url = `http://127.0.0.1:5000/automerge-data`
        const response = await fetch(url, {
          body: binary,
          method: "post",
          headers: {
            "Content-Type": "application/octet-stream",
          }
        })
        .catch((err) => console.log(err)); 
        console.log(response)

        doc = newDoc;
        channel.postMessage(binary);
      }
    }
  }, [docId, editorValue, channel]);

  useEffect(() => {
    updateDocument();
  }, [updateDocument]);

  const deleteDocument = async (docId) => {
    if (Object.keys(doc).length !== 0) {
      const itemIndex = doc.documents.findIndex((item) => item.id === docId);

      if (itemIndex !== -1) {
        let newDoc = Automerge.change(doc, (doc) => {
          doc.documents.splice(itemIndex, 1);
        });

        let binary = Automerge.save(newDoc);
        localforage
          .setItem("automerge-data", binary)
          .catch((err) => console.log(err));

        // Update the server
        let url = `http://127.0.0.1:5000/automerge-data`
        const response = await fetch(url, {
          body: binary,
          method: "post",
          headers: {
            "Content-Type": "application/octet-stream",
          }
        })
        console.log(response)

        doc = newDoc;
        channel.postMessage(binary);
      }
      navigate("/");
    }
  };

  const syncDocument = useCallback(() => {
    channel.onmessage = (ev) => {
      let newDoc = Automerge.merge(doc, Automerge.load(ev.data));
      doc = newDoc;
    };
  }, [channel]);

  useEffect(() => {
    syncDocument();
  }, [syncDocument]);

  return (
    <div className="wrapper">
      <Header
        onClick={() => {
          setEditorVisible(false);
          navigate("/");
        }}
      />
      {!editorVisible ? (
        <ContentWrapper>
          {Object.keys(doc).length !== 0 &&
            doc.documents.map((document, index) => {
              return (
                <DocumentCard
                  key={index}
                  text={document.text}
                  onClick={() => {
                    setEditorVisible(true);
                    navigate(`/${document.id}`);
                  }}
                  deleteHandler={(e) => {
                    e.stopPropagation();
                    deleteDocument(document.id);
                  }}
                />
              );
            })}
          <AddButton
            onClick={() => {
              setEditorVisible(true);
              addDocument();
            }}
          />
        </ContentWrapper>
      ) : (
        <ReactQuill
          theme="snow"
          value={editorValue}
          onChange={setEditorValue}
        />
      )}
    </div>
  );
}