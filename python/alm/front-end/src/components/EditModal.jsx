import { useState } from "react";
import PropTypes from "prop-types";
import "../EditModal.css";

function EditModal({ item, onClose, onSave }) {
  const [editedItem, setEditedItem] = useState({
    ...item,
    cantidadVerificada: item.cantidadVerificada || "",
    nombreVerificador: item.nombreVerificador || "",
  });

  const handleChange = (field, value) => {
    setEditedItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: item.id,
      cantidadVerificada:
        editedItem.cantidadVerificada === ""
          ? null
          : parseInt(editedItem.cantidadVerificada),
      nombreVerificador: editedItem.nombreVerificador,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Editar Registro</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Cantidad Verificada:</label>
            <input
              type="number"
              value={editedItem.cantidadVerificada}
              onChange={(e) =>
                setEditedItem((prev) => ({
                  ...prev,
                  cantidadVerificada: e.target.value,
                }))
              }
            />
          </div>

          <div className="form-group">
            <label>Nombre del Verificador:</label>
            <input
              type="text"
              value={editedItem.nombreVerificador}
              onChange={(e) =>
                setEditedItem((prev) => ({
                  ...prev,
                  nombreVerificador: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="modal-buttons">
            <button type="submit" className="save-button">
              Guardar
            </button>
            <button type="button" onClick={onClose} className="cancel-button">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

EditModal.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    cantidadVerificada: PropTypes.number.isRequired,
    nombreVerificador: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EditModal;
