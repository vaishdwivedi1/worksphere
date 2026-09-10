const ConfirmModal = ({
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // "danger" | "primary"
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const confirmBtnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-5"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[420px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-2 text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">{message}</p>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmBtnClass}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
