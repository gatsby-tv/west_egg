defmodule WestEgg.Register do
  @callback register(Plug.Conn.t(), any, Keyword.t()) :: Plug.Conn.t()

  defmodule RegistrationError do
    defexception message: "invalid registration"
  end

  defmacro __using__(opts) do
    [
      prefix: prefix,
      bucket: bucket,
      spec: spec
    ] = opts

    quote do
      @behaviour WestEgg.Register
      use Plug.Builder
      alias WestEgg.{Auth, Register, Repo}

      defmodule Parameters do
        defstruct [:id, :channel_id, :show_id, :video_id | Keyword.keys(unquote(spec))]
      end

      @impl true
      def call(conn, opts) do
        keys = Keyword.keys(unquote(spec))

        params =
          conn.body_params
          |> Map.take(Enum.map(keys, &to_string/1))
          |> Map.to_list()
          |> Map.new(fn {key, value} -> {String.to_atom(key), value} end)
          |> (&struct(Parameters, &1)).()

        for {key, :required} <- unquote(spec) do
          if is_nil(Map.fetch!(params, key)), do: fail("missing key, '#{key}'")
        end

        params = if :owners in keys, do: add_ownership(params, conn), else: params

        register(conn, params, opts)
      end

      defp add_ownership(%{owners: nil} = params, conn) do
        user = get_session(conn, "user")

        unless is_nil(user),
          do: Map.put(params, :owners, [user]),
          else: raise(Auth.AuthorizationError)
      end

      defp add_ownership(%{owners: owners} = params, conn) do
        # NOTE: modules that invoke this method must check session verification.
        user = get_session(conn, "user")
        if is_nil(user), do: raise(Auth.AuthorizationError)

        cond do
          user not in owners ->
            case Repo.fetch(:repo, :users, user, :profile) do
              {:ok, %{"handle" => handle}} ->
                if handle in owners do
                  # This saves us from having to do another Repo query later.
                  index = Enum.find_index(owners, fn owner -> owner == handle end)
                  Map.put(params, :owners, List.replace_at(owners, index, user))
                else
                  Map.put(params, :owners, [user | owners])
                end

              {:error, %Repo.NotFoundError{}} ->
                raise Auth.AuthorizationError

              {:error, reason} ->
                raise reason
            end

          true ->
            params
        end
      end

      defp fetch(%{owners: owners} = params, :owners) do
        owners =
          for user <- Enum.map(owners, &String.trim/1), into: [] do
            cond do
              String.starts_with?(user, "@") ->
                case Repo.fetch(:repo, :registry, :users, user) do
                  # NOTE: should this fail if the handle is not in use?
                  {:ok, %{"id" => id}} -> id
                  {:error, %Repo.NotFoundError{}} -> fail("unknown user, '#{user}'")
                  {:error, reason} -> raise reason
                end

              true ->
                user
            end
          end

        if length(owners) == 0, do: fail("#{unquote(bucket)} must have at least one owner")

        Map.put(params, :owners, owners)
      end

      defp stage(%{handle: handle} = params, :registry) do
        id =
          :crypto.strong_rand_bytes(16)
          |> Base.encode32(padding: false)
          |> String.downcase()
          |> (&"#{unquote(prefix)}_#{&1}").()

        methods = %{
          "id" => Repo.set(id),
          "in_use?" => Repo.enable()
        }

        Repo.modify(:repo, :registry, unquote(bucket), handle, methods)

        Map.put(params, :id, id)
      end

      defp finish(_params, conn), do: send_resp(conn, :ok, "ok")

      defp fail, do: raise(Register.RegistrationError)
      defp fail(message), do: raise(Register.RegistrationError, message: message)

      defoverridable finish: 2
      defoverridable Register
      defoverridable Plug
    end
  end
end
