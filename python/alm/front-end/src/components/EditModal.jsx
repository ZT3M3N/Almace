import { useState } from "react";
import PropTypes from "prop-types";
import "../EditModal.css";

function EditModal({ item, onClose, onSave }) {
  const [editedItem, setEditedItem] = useState({
    ...item,
    id: item.id,
    cantidadVerificada: item.cantidadVerificada || "", // Usamos string vacío si es null
  });

  const handleChange = (field, value) => {
    setEditedItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      id: editedItem.id,
      cantidadVerificada:
        editedItem.cantidadVerificada === ""
          ? null
          : parseInt(editedItem.cantidadVerificada),
    };
    onSave(dataToSave);
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
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EditModal;
